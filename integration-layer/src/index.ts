/**
 * Integration layer entry point.
 * What: Starts the API gateway (Proxy pattern) on port 8080.
 * Why: Single process bootstrap — logic lives in IntegrationModule.ts.
 * How: Instantiates IntegrationModule and calls start().
 */
import { IntegrationModule } from './IntegrationModule';

const gateway = new IntegrationModule();
gateway.start();
