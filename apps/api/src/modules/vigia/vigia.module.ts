import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { Post } from '../posts/entities/post.entity';
import { VigiaConsigna } from './entities/vigia-consigna.entity';
import {
  VigiaDotacionFirma,
  VigiaNomina,
  VigiaNominaReclamo,
} from './entities/vigia-misc.entity';
import { VigiaMinuta } from './entities/vigia-minuta.entity';
import { VigiaPin } from './entities/vigia-pin.entity';
import { VigiaSos } from './entities/vigia-sos.entity';
import { VigiaTurno } from './entities/vigia-turno.entity';
import { VigiaAuthGuard } from './vigia-auth.guard';
import { VigiaController } from './vigia.controller';
import { VigiaSchemaBootstrap } from './vigia-schema.bootstrap';
import { VigiaService } from './vigia.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    TypeOrmModule.forFeature([
      Associate,
      Post,
      Delivery,
      VigiaTurno,
      VigiaSos,
      VigiaConsigna,
      VigiaMinuta,
      VigiaNomina,
      VigiaNominaReclamo,
      VigiaDotacionFirma,
      VigiaPin,
    ]),
  ],
  controllers: [VigiaController],
  providers: [VigiaService, VigiaAuthGuard, VigiaSchemaBootstrap],
  exports: [VigiaAuthGuard, JwtModule],
})
export class VigiaModule {}
