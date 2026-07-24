import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // HashLocation: en Render Static Site el rewrite /* → index.html solo se
    // configura en el Dashboard. Con #/auth/login las rutas funcionan ya.
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
