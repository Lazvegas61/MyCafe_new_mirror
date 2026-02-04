import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
      return value;
    }

    this.checkForUICalculations(value);

    const object = plainToClass(metadata.metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors.map(
        error => `${error.property}: ${Object.values(error.constraints).join(', ')}`
      );
      throw new BadRequestException(`Validation failed: ${messages.join('; ')}`);
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private checkForUICalculations(value: any): void {
    const checkObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      const jsonString = JSON.stringify(obj).toLowerCase();
      const indicators = ['total', 'sum', 'amount', 'price', 'duration'];
      
      for (const indicator of indicators) {
        if (
          jsonString.includes(`"${indicator}"`) && 
          (jsonString.includes('function') || 
           jsonString.includes('=>') ||
           jsonString.includes('math.'))
        ) {
          throw new BadRequestException(
            `K01 İHLAL: UI hesaplama yapamaz. "${indicator}" ile ilgili hesaplama tespit edildi.`
          );
        }
      }

      Object.values(obj).forEach(val => {
        if (val && typeof val === 'object') {
          checkObject(val);
        }
      });
    };

    checkObject(value);
  }
}
