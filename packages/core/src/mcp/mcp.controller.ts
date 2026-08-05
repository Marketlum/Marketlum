import { Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpGuard } from './mcp.guard';
import { McpServerFactory } from './mcp-server.factory';
import { User } from '../users/entities/user.entity';

// JSON-RPC over Streamable HTTP, stateless mode (spec 023 Q2/Q14): no
// Mcp-Session-Id, no SSE stream, a fresh transport + server pair per request.
// Excluded from Swagger — the surface is described by the MCP protocol itself.
@ApiExcludeController()
@Controller('mcp')
export class McpController {
  constructor(private readonly serverFactory: McpServerFactory) {}

  @Post()
  @UseGuards(McpGuard)
  async handle(@Req() req: Request & { user: User }, @Res() res: Response): Promise<void> {
    const server = await this.serverFactory.create(req.user);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  @Get()
  rejectGet(@Res() res: Response): void {
    this.methodNotAllowed(res);
  }

  @Delete()
  rejectDelete(@Res() res: Response): void {
    this.methodNotAllowed(res);
  }

  private methodNotAllowed(res: Response): void {
    // Stateless servers have no SSE stream to GET and no session to DELETE.
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed' },
      id: null,
    });
  }
}
