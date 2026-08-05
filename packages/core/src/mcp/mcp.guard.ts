import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// The MCP endpoint accepts API keys only (spec 023 Q4) — no JWT session
// cookies, unlike AdminGuard. Per-tool permission checks happen inside the
// MCP request handlers, not here, because every MCP call is a POST and the
// HTTP-method-based permission inference does not apply.
@Injectable()
export class McpGuard extends AuthGuard('api-key') {}
