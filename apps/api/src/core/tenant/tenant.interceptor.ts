import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantContext } from './tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const url: string = req?.originalUrl || req?.url || '';

    // Rutas de autenticación y administración multi-organización donde no forzamos el header x-organization-id
    const isAuthOrGlobalRoute =
      url.startsWith('/auth/') ||
      url.startsWith('/user-roles/') ||
      url.startsWith('/organizations') ||
      url.startsWith('/verticals') ||
      url.startsWith('/studio-bookings/public/') ||
      req?.headers?.['x-tenant-scope'] === 'global';

    const queryOrgId =
      typeof req?.query?.organizationId === 'string' &&
      req.query.organizationId.trim()
        ? req.query.organizationId.trim()
        : undefined;

    const headerOrgId =
      typeof req?.headers?.['x-organization-id'] === 'string' &&
      req.headers['x-organization-id'].trim()
        ? req.headers['x-organization-id'].trim()
        : undefined;

    const organizationId = !isAuthOrGlobalRoute
      ? headerOrgId || queryOrgId
      : queryOrgId;

    if (organizationId && !isAuthOrGlobalRoute) {
      if (req?.query && typeof req.query === 'object') {
        req.query.organizationId = organizationId;
      }
      if (
        req?.body &&
        typeof req.body === 'object' &&
        !Array.isArray(req.body) &&
        req.body.organizationId
      ) {
        req.body.organizationId = organizationId;
      }
    }

    return new Observable((subscriber) => {
      tenantContext.run({ organizationId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}

