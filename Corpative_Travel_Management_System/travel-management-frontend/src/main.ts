import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import 'zone.js';  // Loads Zone.js into the browser environment

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
