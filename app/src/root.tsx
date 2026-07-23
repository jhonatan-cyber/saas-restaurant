/**
 * Root entry point for TanStack Start SSR
 * This file is required for the TanStack Start Vite plugin (≥1.131)
 *
 * Import the Boneyard bones registry so skeleton components
 * can resolve pre-generated bone positions at runtime.
 */
import './bones/registry';

export { Route } from './routes/__root'
