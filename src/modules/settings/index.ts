/**
 * Puerta de entrada del módulo de configuración del comercio (asistente y Mi local).
 * Server Actions en "@/modules/settings/actions".
 */
export { BrandForm, BrandingImage } from "./components/brand-form";
export { ContactForm } from "./components/contact-form";
export { HoursForm } from "./components/hours-form";
export { PublishPanel } from "./components/publish-panel";
export { SetupChecklist } from "./components/setup-checklist";
export {
  getHours,
  getSettings,
  getSetupStatus,
  listBusinessTemplates,
  listSupportAccesses,
  type SetupStatus,
  type TenantSettings,
} from "./queries";
export {
  BRAND_PALETTE,
  parseSettingsSection,
  provisionSchema,
  SETTINGS_SECTIONS,
  STEP_LABEL,
  WIZARD_STEPS,
  type SettingsSection,
  type WizardStep,
} from "./schemas";
