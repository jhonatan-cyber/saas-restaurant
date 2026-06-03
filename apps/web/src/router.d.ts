import { Route } from '@tanstack/react-router';

// Auto-generated route tree types for TanStack Router
// This file is generated based on the file-based routing convention

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/';
      path: '/';
      fullPath: '/';
      preLoader: typeof import('./routes/index').Route;
    };
    '/login': {
      id: '/login';
      path: '/login';
      fullPath: '/login';
      preLoader: typeof import('./routes/login').Route;
    };
    '/_authed': {
      id: '/_authed';
      path: '';
      fullPath: '';
      preLoader: typeof import('./routes/_authed').Route;
    };
    '/_authed/audit': {
      id: '/_authed/audit';
      path: '/audit';
      fullPath: '/audit';
      preLoader: typeof import('./routes/_authed/audit').Route;
    };
    '/_authed/branches': {
      id: '/_authed/branches';
      path: '/branches';
      fullPath: '/branches';
      preLoader: typeof import('./routes/_authed/branches').Route;
    };
    '/_authed/branches/$id': {
      id: '/_authed/branches/$id';
      path: '/branches/$id';
      fullPath: '/branches/$id';
      preLoader: typeof import('./routes/_authed/branches.$id').Route;
    };
    '/_authed/branches/new': {
      id: '/_authed/branches/new';
      path: '/branches/new';
      fullPath: '/branches/new';
      preLoader: typeof import('./routes/_authed/branches.new').Route;
    };
    '/_authed/business': {
      id: '/_authed/business';
      path: '/business';
      fullPath: '/business';
      preLoader: typeof import('./routes/_authed/business').Route;
    };
    '/_authed/cash': {
      id: '/_authed/cash';
      path: '/cash';
      fullPath: '/cash';
      preLoader: typeof import('./routes/_authed/cash').Route;
    };
    '/_authed/cash-movements': {
      id: '/_authed/cash-movements';
      path: '/cash-movements';
      fullPath: '/cash-movements';
      preLoader: typeof import('./routes/_authed/cash-movements').Route;
    };
    '/_authed/categories': {
      id: '/_authed/categories';
      path: '/categories';
      fullPath: '/categories';
      preLoader: typeof import('./routes/_authed/categories').Route;
    };
    '/_authed/categories/$id': {
      id: '/_authed/categories/$id';
      path: '/categories/$id';
      fullPath: '/categories/$id';
      preLoader: typeof import('./routes/_authed/categories.$id').Route;
    };
    '/_authed/categories/new': {
      id: '/_authed/categories/new';
      path: '/categories/new';
      fullPath: '/categories/new';
      preLoader: typeof import('./routes/_authed/categories.new').Route;
    };
    '/_authed/customers': {
      id: '/_authed/customers';
      path: '/customers';
      fullPath: '/customers';
      preLoader: typeof import('./routes/_authed/customers').Route;
    };
    '/_authed/customers/$id': {
      id: '/_authed/customers/$id';
      path: '/customers/$id';
      fullPath: '/customers/$id';
      preLoader: typeof import('./routes/_authed/customers.$id').Route;
    };
    '/_authed/customers/new': {
      id: '/_authed/customers/new';
      path: '/customers/new';
      fullPath: '/customers/new';
      preLoader: typeof import('./routes/_authed/customers.new').Route;
    };
    '/_authed/dashboard': {
      id: '/_authed/dashboard';
      path: '/dashboard';
      fullPath: '/dashboard';
      preLoader: typeof import('./routes/_authed/dashboard').Route;
    };
    '/_authed/inventory': {
      id: '/_authed/inventory';
      path: '/inventory';
      fullPath: '/inventory';
      preLoader: typeof import('./routes/_authed/inventory').Route;
    };
    '/_authed/kds': {
      id: '/_authed/kds';
      path: '/kds';
      fullPath: '/kds';
      preLoader: typeof import('./routes/_authed/kds').Route;
    };
    '/_authed/orders': {
      id: '/_authed/orders';
      path: '/orders';
      fullPath: '/orders';
      preLoader: typeof import('./routes/_authed/orders').Route;
    };
    '/_authed/orders/$id': {
      id: '/_authed/orders/$id';
      path: '/orders/$id';
      fullPath: '/orders/$id';
      preLoader: typeof import('./routes/_authed/orders.$id').Route;
    };
    '/_authed/plans': {
      id: '/_authed/plans';
      path: '/plans';
      fullPath: '/plans';
      preLoader: typeof import('./routes/_authed/plans').Route;
    };
    '/_authed/plans/$id': {
      id: '/_authed/plans/$id';
      path: '/plans/$id';
      fullPath: '/plans/$id';
      preLoader: typeof import('./routes/_authed/plans.$id').Route;
    };
    '/_authed/plans/new': {
      id: '/_authed/plans/new';
      path: '/plans/new';
      fullPath: '/plans/new';
      preLoader: typeof import('./routes/_authed/plans.new').Route;
    };
    '/_authed/pos': {
      id: '/_authed/pos';
      path: '/pos';
      fullPath: '/pos';
      preLoader: typeof import('./routes/_authed/pos').Route;
    };
    '/_authed/preparation-areas': {
      id: '/_authed/preparation-areas';
      path: '/preparation-areas';
      fullPath: '/preparation-areas';
      preLoader: typeof import('./routes/_authed/preparation-areas').Route;
    };
    '/_authed/preparation-areas/$id': {
      id: '/_authed/preparation-areas/$id';
      path: '/preparation-areas/$id';
      fullPath: '/preparation-areas/$id';
      preLoader: typeof import('./routes/_authed/preparation-areas.$id').Route;
    };
    '/_authed/preparation-areas/new': {
      id: '/_authed/preparation-areas/new';
      path: '/preparation-areas/new';
      fullPath: '/preparation-areas/new';
      preLoader: typeof import('./routes/_authed/preparation-areas.new').Route;
    };
    '/_authed/products': {
      id: '/_authed/products';
      path: '/products';
      fullPath: '/products';
      preLoader: typeof import('./routes/_authed/products').Route;
    };
    '/_authed/products/$id': {
      id: '/_authed/products/$id';
      path: '/products/$id';
      fullPath: '/products/$id';
      preLoader: typeof import('./routes/_authed/products.$id').Route;
    };
    '/_authed/products/new': {
      id: '/_authed/products/new';
      path: '/products/new';
      fullPath: '/products/new';
      preLoader: typeof import('./routes/_authed/products.new').Route;
    };
    '/_authed/purchases': {
      id: '/_authed/purchases';
      path: '/purchases';
      fullPath: '/purchases';
      preLoader: typeof import('./routes/_authed/purchases').Route;
    };
    '/_authed/purchases/$id': {
      id: '/_authed/purchases/$id';
      path: '/purchases/$id';
      fullPath: '/purchases/$id';
      preLoader: typeof import('./routes/_authed/purchases.$id').Route;
    };
    '/_authed/purchases/new': {
      id: '/_authed/purchases/new';
      path: '/purchases/new';
      fullPath: '/purchases/new';
      preLoader: typeof import('./routes/_authed/purchases.new').Route;
    };
    '/_authed/reports': {
      id: '/_authed/reports';
      path: '/reports';
      fullPath: '/reports';
      preLoader: typeof import('./routes/_authed/reports').Route;
    };
    '/_authed/suppliers': {
      id: '/_authed/suppliers';
      path: '/suppliers';
      fullPath: '/suppliers';
      preLoader: typeof import('./routes/_authed/suppliers').Route;
    };
    '/_authed/suppliers/$id': {
      id: '/_authed/suppliers/$id';
      path: '/suppliers/$id';
      fullPath: '/suppliers/$id';
      preLoader: typeof import('./routes/_authed/suppliers.$id').Route;
    };
    '/_authed/suppliers/new': {
      id: '/_authed/suppliers/new';
      path: '/suppliers/new';
      fullPath: '/suppliers/new';
      preLoader: typeof import('./routes/_authed/suppliers.new').Route;
    };
    '/_authed/tables': {
      id: '/_authed/tables';
      path: '/tables';
      fullPath: '/tables';
      preLoader: typeof import('./routes/_authed/tables').Route;
    };
    '/_authed/tables/$id': {
      id: '/_authed/tables/$id';
      path: '/tables/$id';
      fullPath: '/tables/$id';
      preLoader: typeof import('./routes/_authed/tables.$id').Route;
    };
    '/_authed/tables/new': {
      id: '/_authed/tables/new';
      path: '/tables/new';
      fullPath: '/tables/new';
      preLoader: typeof import('./routes/_authed/tables.new').Route;
    };
    '/_authed/users': {
      id: '/_authed/users';
      path: '/users';
      fullPath: '/users';
      preLoader: typeof import('./routes/_authed/users').Route;
    };
    '/_authed/users/$id': {
      id: '/_authed/users/$id';
      path: '/users/$id';
      fullPath: '/users/$id';
      preLoader: typeof import('./routes/_authed/users.$id').Route;
    };
    '/_authed/users/new': {
      id: '/_authed/users/new';
      path: '/users/new';
      fullPath: '/users/new';
      preLoader: typeof import('./routes/_authed/users.new').Route;
    };
  }
}
