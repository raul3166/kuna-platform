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

    const organizationId =
      queryOrgId || (!isAuthOrGlobalRoute ? headerOrgId : undefined);

    return new Observable((subscriber) => {
      tenantContext.run({ organizationId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}

