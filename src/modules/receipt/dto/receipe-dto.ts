import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

class Amounts {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Electronic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  AdvancePayment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Credit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Provision?: string;
}

class AgentData {
  @ApiProperty()
  @IsString()
  AgentOperationName: string;

  @ApiProperty()
  @IsString()
  PaymentAgentPhone: string;

  @ApiProperty()
  @IsString()
  PaymentReceiverOperatorPhone: string;

  @ApiProperty()
  @IsString()
  TransferOperatorPhone: string;

  @ApiProperty()
  @IsString()
  TransferOperatorName: string;

  @ApiProperty()
  @IsString()
  TransferOperatorAddress: string;

  @ApiProperty()
  @IsString()
  TransferOperatorInn: string;
}

class PurveyorData {
  @ApiProperty()
  @IsString()
  Name: string;

  @ApiProperty()
  @IsString()
  Inn: string;

  @ApiProperty()
  @IsString()
  Phone: string;
}

class ProductCodeData {
  @ApiProperty()
  @IsString()
  CodeProductNomenclature: string;
}

class MarkPartQuantity {
  @ApiProperty()
  @IsNumber()
  Numerator: number;

  @ApiProperty()
  @IsNumber()
  Denominator: number;
}

class UserRequisiteData {
  @ApiProperty()
  @IsString()
  RequisiteKey: string;

  @ApiProperty()
  @IsString()
  RequisiteValue: string;
}

class OperationReceiptRequisite {
  @ApiProperty()
  @IsNumber()
  OperationIdentifier: number;

  @ApiProperty()
  @IsString()
  OperationDate: string;

  @ApiProperty()
  @IsString()
  OperationData: string;
}

class IndustryRequisite {
  @ApiProperty()
  @IsString()
  Code: string;

  @ApiProperty()
  @IsString()
  DocumentDate: string;

  @ApiProperty()
  @IsString()
  DocumentNumber: string;

  @ApiProperty()
  @IsString()
  RequisiteValue: string;
}

class Item {
  @ApiProperty()
  @IsString()
  Label: string;

  @ApiProperty()
  @IsString()
  Price: string;

  @ApiProperty()
  @IsString()
  Quantity: string;

  @ApiProperty()
  @IsString()
  Vat: string;

  @ApiProperty()
  @IsString()
  Amount: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Object?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  MeasurementUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Excise?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CountryOriginCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomsDeclarationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  AgentSign?: string;

  @ApiPropertyOptional({ type: AgentData })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgentData)
  AgentData?: AgentData;

  @ApiPropertyOptional({ type: PurveyorData })
  @IsOptional()
  @ValidateNested()
  @Type(() => PurveyorData)
  PurveyorData?: PurveyorData;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  AdditionalPositionInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  SaleObjectData?: string;

  @ApiPropertyOptional({ type: [IndustryRequisite] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IndustryRequisite)
  IndustryRequisiteCollection?: IndustryRequisite[];

  @ApiPropertyOptional({ type: ProductCodeData })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductCodeData)
  ProductCodeData?: ProductCodeData;

  @ApiPropertyOptional({ type: MarkPartQuantity })
  @IsOptional()
  @ValidateNested()
  @Type(() => MarkPartQuantity)
  MarkPartQuantity?: MarkPartQuantity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  RawMarkCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  GroupSeparator?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  UnitCode?: string;
}

class CustomerReceipt {
  @ApiProperty({ type: [Item] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Item)
  Items: Item[];

  @ApiProperty()
  @IsString()
  TaxationSystem: string;

  @ApiProperty({ type: Amounts })
  @ValidateNested()
  @Type(() => Amounts)
  Amounts: Amounts;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CalculationPlace?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  Email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  Phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomerInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomerInn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBso?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  AgentSign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CashierName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  AdditionalReceiptInfos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  AdditionalReceiptRequisite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomerBirthday?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomerStateCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomerDocType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomerDoc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  CustomerPlace?: string;

  @ApiPropertyOptional({ type: UserRequisiteData })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserRequisiteData)
  UserRequisiteData?: UserRequisiteData;

  @ApiPropertyOptional({ type: OperationReceiptRequisite })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperationReceiptRequisite)
  OperationReceiptRequisite?: OperationReceiptRequisite;

  @ApiPropertyOptional({ type: [IndustryRequisite] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => IndustryRequisite)
  IndustryRequisiteCollection?: IndustryRequisite[];
}

export class ReceiptRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  Inn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  Type: string;

  @ApiProperty({ type: CustomerReceipt })
  @ValidateNested()
  @Type(() => CustomerReceipt)
  CustomerReceipt: CustomerReceipt;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  InvoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  AccountId?: string;
}
