-- Миграция для добавления полей блокировки карт

-- Добавляем поле для временной блокировки карт
ALTER TABLE card ADD COLUMN blocked_until TIMESTAMP NULL;

-- Добавляем индекс для быстрого поиска заблокированных карт
CREATE INDEX idx_card_blocked_until ON card(blocked_until) WHERE blocked_until IS NOT NULL;

-- Обновляем существующие статусы карт (если нужно)
-- UPDATE card SET status = 'Approved' WHERE status = 'Active';

-- Добавляем поле для счетчика попыток (если его еще нет)
ALTER TABLE otp ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0;
ALTER TABLE otp ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Создаем таблицу для логирования ошибок (опционально)
CREATE TABLE IF NOT EXISTS error_log (
    id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transaction(id),
    card_id INT REFERENCES card(id),
    error_code INT NOT NULL,
    error_reason VARCHAR(255),
    attempt_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_error_log_card_id (card_id),
    INDEX idx_error_log_error_code (error_code),
    INDEX idx_error_log_created_at (created_at)
);

-- Создаем таблицу для хранения настроек справочников (опционально)
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Вставляем настройки по умолчанию
INSERT INTO system_config (config_key, config_value, description) VALUES
('first_card_ban_minutes', '60', 'Время первой блокировки карты в минутах'),
('second_card_ban_hours', '24', 'Время второй блокировки карты в часах'),
('otp_timeout_minutes', '2', 'Время жизни OTP в минутах'),
('max_retry_attempts', '3', 'Максимальное количество попыток'),
('enable_error_categorization', 'true', 'Включить категоризацию ошибок')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;