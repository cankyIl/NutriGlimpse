// Re-export the native module. On web, it will be resolved to PrivateInputModule.web.ts
// and on native platforms to PrivateInputModule.ts
export { default } from './src/PrivateInputModule';
export * from './src/PrivateInput.types';
