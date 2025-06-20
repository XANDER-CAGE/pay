-- Миграция для добавления поддержки всех типов webhook-ов

-- 1. Обновляем enum для типов hook-ов, если нужно добавить 'recurrent'
-- (зависит от текущей структуры БД)
ALTER TYPE hook_type ADD VALUE IF NOT EXISTS 'recurrent';

-- 2. Добавляем поле для API secret в таблицу cashbox
ALTER TABLE cashbox 
ADD COLUMN IF NOT EXISTS webhook_api_secret VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_hook_cashbox_type_active 
ON hook(cashbox_id, type, is_active) 
WHERE is_active = true;

CREATE TABLE IF NOT EXISTS webhook_log (
  id SERIAL PRIMARY KEY,
  hook_id INTEGER REFERENCES hook(id),
  transaction_id INTEGER REFERENCES transaction(id),
  webhook_type VARCHAR(20) NOT NULL,
  url VARCHAR(500) NOT NULL,
  request_body TEXT,
  response_code INTEGER,
  response_body TEXT,
  attempt_number INTEGER DEFAULT 1,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_transaction 
ON webhook_log(transaction_id);

CREATE INDEX IF NOT EXISTS idx_webhook_log_created 
ON webhook_log(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_log_success 
ON webhook_log(success, attempt_number);

ALTER TABLE transaction 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100);

CREATE TABLE IF NOT EXISTS subscription (
  id SERIAL PRIMARY KEY,
  unique_id VARCHAR(50) UNIQUE NOT NULL,
  account_id VARCHAR(100) NOT NULL,
  description TEXT,
  email VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UZS',
  require_confirmation BOOLEAN DEFAULT false,
  start_date TIMESTAMP NOT NULL,
  interval_type VARCHAR(10) NOT NULL, -- 'Week', 'Month'
  period_value INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Paused', 'Cancelled', 'Expired'
  successful_transactions_number INTEGER DEFAULT 0,
  failed_transactions_number INTEGER DEFAULT 0,
  max_periods INTEGER,
  last_transaction_date TIMESTAMP,
  next_transaction_date TIMESTAMP,
  cashbox_id INTEGER REFERENCES cashbox(id),
  card_id INTEGER REFERENCES card(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Индексы для таблицы подписок
CREATE INDEX IF NOT EXISTS idx_subscription_account 
ON subscription(account_id);

CREATE INDEX IF NOT EXISTS idx_subscription_status 
ON subscription(status);

CREATE INDEX IF NOT EXISTS idx_subscription_next_payment 
ON subscription(next_transaction_date) 
WHERE status = 'Active';

-- 9. Обновляем поле type в таблице transaction для поддержки 'refund' если нужно
-- ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'refund';

-- 10. Функция для обновления updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_webhook_log_updated_at ON webhook_log;
CREATE TRIGGER update_webhook_log_updated_at 
    BEFORE UPDATE ON webhook_log 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_updated_at ON subscription;
CREATE TRIGGER update_subscription_updated_at 
    BEFORE UPDATE ON subscription 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 12. Добавляем комментарии к таблицам
COMMENT ON TABLE webhook_log IS 'Логирование всех webhook уведомлений';
COMMENT ON TABLE subscription IS 'Рекуррентные подписки для регулярных платежей';

-- 13. Настройки по умолчанию для существующих касс (устанавливаем webhook_api_secret)
UPDATE cashbox 
SET webhook_api_secret = password_api 
WHERE webhook_api_secret IS NULL AND password_api IS NOT NULL;