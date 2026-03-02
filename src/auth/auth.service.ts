import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return null;
    }
    return { id: user.id, username: user.username };
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) throw new UnauthorizedException('Invalid username or password');
    return { access_token: this.jwt.sign({ sub: user.id, username: user.username }) };
  }

  async register(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) throw new ConflictException('Username already taken');
    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { username, password: hash },
      select: { id: true, username: true },
    });
    return { access_token: this.jwt.sign({ sub: user.id, username: user.username }) };
  }
}
