import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Enable HTTP communication with the backend by registering provideHttpClient()
    provideHttpClient(),
    // This tells Angular to listen to asynchronous events 
    // (HTTP responses, button clicks, form inputs) through Zone.js to automatically update the DOM
    provideZoneChangeDetection({ eventCoalescing: true}),

  ]
};
