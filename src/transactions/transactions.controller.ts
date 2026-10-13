import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { Role } from '../common/enums/role.enum';
import { userActiveInterface } from '../common/interfaces/user-active.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Auth(Role.USER)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @ActiveUser() user: userActiveInterface,
  ) {
    return this.transactionsService.create(createTransactionDto, user);
  }

  @Get()
  findAll(
    @ActiveUser() user: userActiveInterface,
    @Query() query: FindTransactionsQueryDto,
  ) {
    return this.transactionsService.findAll(user, query);
  }

  @Get('summary')
  summary(@ActiveUser() user: userActiveInterface) {
    return this.transactionsService.summary(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: userActiveInterface,
  ) {
    return this.transactionsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @ActiveUser() user: userActiveInterface,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, user);
  }

  @Patch(':id/restore')
  restore(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: userActiveInterface,
  ) {
    return this.transactionsService.restore(id, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: userActiveInterface,
  ) {
    return this.transactionsService.remove(id, user);
  }
}
