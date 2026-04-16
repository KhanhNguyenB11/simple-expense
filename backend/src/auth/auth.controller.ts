import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

const COOKIE_NAME = "access_token";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly cookieOpts: Record<string, unknown>;

  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {
    this.cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: this.config.get<string>("nodeEnv") === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "Sets HTTP-only cookie and returns user info",
  })
  @ApiResponse({ status: 409, description: "Email already in use" })
  @Post("signup")
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user } = await this.authService.signup(dto);
    res.cookie(COOKIE_NAME, accessToken, this.cookieOpts);
    return { user };
  }

  @ApiOperation({ summary: "Log in — sets HTTP-only JWT cookie" })
  @ApiResponse({
    status: 200,
    description: "Sets HTTP-only cookie and returns user info",
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, user } = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, accessToken, this.cookieOpts);
    return { user };
  }

  @ApiOperation({ summary: "Log out — clears the JWT cookie" })
  @ApiResponse({ status: 200, description: "Cookie cleared" })
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return { message: "Logged out" };
  }

  @ApiOperation({ summary: "Get currently authenticated user" })
  @ApiResponse({ status: 200, description: "Current user profile" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: { id: string; email: string; role: string }) {
    return { user };
  }
}
