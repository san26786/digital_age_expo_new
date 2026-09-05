"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Briefcase,
  Building,
  Package,
  Palette,
  Target,
  TrendingUp,
  FolderHeart,
  AlertCircle,
  Building2,
  FileText,
  Mic,
  Lightbulb,
  Megaphone,
  DollarSign,
  LineChart,
  CreditCard,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Search,
  Check,
  Award,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Globe,
  Trash2,
} from "lucide-react";

/** ---------- Step Configurations ---------- */
const TABS = [
  "Personal Details",
  "Choose a Business",
  "Business Profile",
  "Products and Services",
  "Brand Kit",
  "Business Intents",
  "My Business Goals",
  "My Focus Area",
  "Key Business Challenges",
  "Department Cost Center",
  "Business Briefing",
  "Elevator Pitch",
  "Key Driving Factor",
  "My Listing Adverts",
  "My Expense Overheads",
  "Financial Planning",
  "My Business Card",
  "Finish",
];

const STEP_ICONS = [
  User,
  Briefcase,
  Building,
  Package,
  Palette,
  Target,
  TrendingUp,
  FolderHeart,
  AlertCircle,
  Building2,
  FileText,
  Mic,
  Lightbulb,
  Megaphone,
  DollarSign,
  LineChart,
  CreditCard,
  CheckCircle,
];

/**
 * The signed-in user's own details, read server-side from their session and passed in. The
 * wizard never fetches an identity itself and never takes one from the URL.
 */
export interface OnboardingProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  linkedin: string;
  businessName: string;
  dateOfBirth: string;
  profileDescription: string;
}

/**
 * The step-1 fields that mirror the user's find_users row. They are re-seeded from the server on
 * every load (see the restore effect), so this list is the single place that decides which fields
 * the account owns and which the draft owns.
 */
const IDENTITY_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "jobTitle",
  "linkedin",
  "dateOfBirth",
  "profileDescription",
  "businessName",
] as const;

const DRAFT_KEY = "findusonweb_onboarding_data";
const STEP_KEY = "findusonweb_onboarding_step";
/** Which account the saved draft belongs to — see the restore effect for why this matters. */
const OWNER_KEY = "findusonweb_onboarding_user";

export function AccountOnboardingManager({
  userId,
  initialProfile,
}: {
  userId: number;
  initialProfile: OnboardingProfile;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Personal Details — seeded from the signed-in account, editable from here on.
    firstName: initialProfile.firstName,
    lastName: initialProfile.lastName,
    email: initialProfile.email,
    phone: initialProfile.phone,
    jobTitle: initialProfile.jobTitle,
    linkedin: initialProfile.linkedin,
    dateOfBirth: initialProfile.dateOfBirth,
    profileDescription: initialProfile.profileDescription,

    // Step 2: Choose a Business
    businessRelationType: "register", // "register" | "claim"
    businessSearchQuery: "",

    // Step 3: Business Profile
    businessName: initialProfile.businessName,
    category: "Technology",
    website: "",
    businessDescription: "",
    regNumber: "",

    // Step 4: Products and Services
    offeringDescription: "",
    mainProductName: "",
    pricingModel: "SaaS Subscription",
    targetAudience: "",

    // Step 5: Brand Kit
    brandColorPrimary: "#6366f1",
    brandColorSecondary: "#ec4899",
    slogan: "",
    brandGuidelines: "",
    logoFileName: "",

    // Step 6: Business Intents (MyBusinessPriorities)
    intents: [] as string[],

    // Step 7: My Business Goals (MyBusinessTargets)
    goalShortTerm: "",
    goalMidTerm: "",
    goalLongTerm: "",

    // Step 8: My Focus Area (top_challenges)
    focusArea: "Lead Generation & Sales",

    // Step 9: Key Business Challenges (KeyBusinessChallenges)
    challenges: [] as string[],

    // Step 10: Department Cost Center (listing_department)
    deptName: "Marketing",
    deptCostCenterCode: "",
    deptBudget: "",
    deptPriority: "",

    // Step 11: Business Briefing (business_briefing)
    briefingTitle: "",
    briefingOverview: "",
    strategicAssets: "",
    competitiveEdge: "",

    // Step 12: Elevator Pitch (elavator_pitch)
    pitchHook: "",
    pitchProblem: "",
    pitchSolution: "",
    pitchCallToAction: "",

    // Step 13: Key Driving Factor (my_goals_why_did_i_join)
    drivingFactors: [] as string[],

    // Step 14: My Listing Adverts (listing_adverts)
    advertHeading: "",
    advertSubheading: "",
    advertBody: "",
    advertTargetUrl: "",

    // Step 15: My Expense Overheads (purchase_context)
    fixedOverheads: "",
    variableBudget: "",
    expenseReductionTarget: "",
    expenseCategories: "",

    // Step 16: Financial Planning (listing_cost_of_sales)
    targetRevenue: "",
    costOfSalesPercent: "30",
    expectedMarginPercent: "40",
    fundingRequired: "",

    // Step 17: My Business Card (listing_business_card)
    cardLayout: "dark-glow", // "dark-glow" | "peach-luxury" | "minimal-light"
    cardTagline: "",
    cardDisplayAddress: "",
  });

  /**
   * Restore an in-progress draft from this browser.
   *
   * Two things this has to get right, neither of which the old version did:
   *
   *  - THE DRAFT MUST BELONG TO THIS ACCOUNT. The draft is one shared localStorage key on a
   *    device that may be shared — a stand PC, a family laptop. Restoring it unconditionally
   *    would show the previous person's name, email and phone to whoever signs in next. So the
   *    owning user id is stored with it, and a draft belonging to someone else is discarded.
   *
   *  - MERGE, DON'T REPLACE. The old code did setFormData(JSON.parse(saved)), swapping the whole
   *    object for whatever shape was saved. Any field added to the wizard later would come back
   *    `undefined` for a returning user, flipping its input from controlled to uncontrolled.
   *    Spreading the saved values over the current defaults keeps new fields defined.
   */
  useEffect(() => {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== String(userId)) {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(STEP_KEY);
      localStorage.removeItem(OWNER_KEY);
      return;
    }

    const saved = localStorage.getItem(DRAFT_KEY);
    const savedStep = localStorage.getItem(STEP_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((current) => {
          const merged = { ...current, ...parsed };
          // A draft saved BEFORE the page learned to prefill holds "" for every identity field,
          // and a blank string is a perfectly valid value to spread — so the merge above happily
          // overwrote the account details with nothing, which is why the form kept rendering
          // empty for a signed-in user. An empty draft value means "never filled in", not
          // "deliberately cleared", so the account's own value wins over it.
          for (const key of IDENTITY_FIELDS) {
            if (!merged[key]) merged[key] = current[key];
          }
          return merged;
        });
      } catch (e) {
        console.error("Error loading onboarding state", e);
      }
    }
    if (savedStep) {
      const stepIdx = parseInt(savedStep, 10);
      if (stepIdx >= 0 && stepIdx < TABS.length) {
        setCurrentStep(stepIdx);
      }
    }
  }, [userId]);

  // Save to LocalStorage whenever state changes
  const saveState = (data: typeof formData, step: number) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    localStorage.setItem(STEP_KEY, String(step));
    localStorage.setItem(OWNER_KEY, String(userId));
  };

  const updateField = (key: keyof typeof formData, value: any) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    saveState(updated, currentStep);
  };

  const handleNext = () => {
    if (currentStep < TABS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveState(formData, nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveState(formData, prevStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStepJump = (idx: number) => {
    setCurrentStep(idx);
    saveState(formData, idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to clear your progress and restart?")) {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(STEP_KEY);
      localStorage.removeItem(OWNER_KEY);
      window.location.reload();
    }
  };

  // Toggle multi-select array elements helper
  const handleToggleItem = (key: "intents" | "challenges" | "drivingFactors", value: string) => {
    const currentList = formData[key] as string[];
    const newList = currentList.includes(value)
      ? currentList.filter((item) => item !== value)
      : [...currentList, value];
    updateField(key, newList);
  };

  // Progress percentage (current step / total steps)
  const progressPercent = Math.round((currentStep / (TABS.length - 1)) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* =====================================================
          LEFT SIDEBAR: PROGRESS & STEPS (DESKTOP)
      ====================================================== */}
      <div className="lg:col-span-4 space-y-6">
        {/* Progress Summary Card */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Onboarding Progress</span>
            <span className="text-sm font-black text-white">{progressPercent}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-3 text-[11px] text-zinc-400 leading-relaxed font-medium">
            Step {currentStep + 1} of {TABS.length}: <span className="text-white font-bold">{TABS[currentStep]}</span>
          </p>
        </div>

        {/* Vertical Stepper */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 max-h-[500px] overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {TABS.map((tabName, idx) => {
              const Icon = STEP_ICONS[idx];
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;

              return (
                <button
                  key={tabName}
                  onClick={() => handleStepJump(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/20 border border-indigo-500/30 text-white font-bold shadow-lg"
                      : isCompleted
                      ? "text-emerald-400 hover:bg-white/5"
                      : "text-zinc-500 hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold shrink-0 ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {isCompleted ? <Check size={12} /> : idx + 1}
                  </div>
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{tabName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset progress */}
        <button
          onClick={handleReset}
          className="w-full py-2.5 px-4 rounded-xl border border-rose-500/20 text-rose-400 text-xs font-semibold bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
        >
          Reset Onboarding Data
        </button>
      </div>

      {/* =====================================================
          RIGHT SIDEBAR: ACTIVE STEP CONTAINER
      ====================================================== */}
      <div className="lg:col-span-8">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-zinc-900/60 p-6 sm:p-8 shadow-[0_0_50px_-12px_rgb(var(--color-indigo-500-rgb) / 0.15)] backdrop-blur-md min-h-[520px] flex flex-col justify-between">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Header inside form */}
              <div className="border-b border-white/5 pb-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                  {(() => {
                    const ActiveIcon = STEP_ICONS[currentStep];
                    return <ActiveIcon size={20} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{TABS[currentStep]}</h3>
                  <p className="text-xs text-zinc-400 font-medium">Please fulfill the parameters of this onboarding chapter.</p>
                </div>
              </div>

              {/* ==================== STEP FIELDS ==================== */}

              {/* Step 1: Personal Details */}
              {currentStep === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      placeholder="e.g. John"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      placeholder="e.g. Smith"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="john.smith@company.com"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+44 7123 456789"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Job Title</label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => updateField("jobTitle", e.target.value)}
                      placeholder="e.g. Managing Director"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">LinkedIn URL</label>
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => updateField("linkedin", e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  {/* Date of Birth and Profile Description exist on the legacy Personal Details
                      step and on find_users, but had no field here — so the data was read and
                      then had nowhere to go. */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateField("dateOfBirth", e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-300">Profile Description</label>
                    <textarea
                      rows={4}
                      value={formData.profileDescription}
                      onChange={(e) => updateField("profileDescription", e.target.value)}
                      placeholder="A short introduction that appears on your public profile."
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Choose a Business */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Decide whether you wish to register a brand-new business profile or claim/link an existing business profile that is already on our platform.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateField("businessRelationType", "register")}
                      className={`flex flex-col gap-3 p-5 rounded-2xl text-left border transition-all ${
                        formData.businessRelationType === "register"
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg scale-[1.01]"
                          : "border-white/10 bg-zinc-950/40 hover:bg-zinc-950/60"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Register Fresh Business</h4>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          Setup a brand-new entity structure, configure listings from scratch, and map parameters newly.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField("businessRelationType", "claim")}
                      className={`flex flex-col gap-3 p-5 rounded-2xl text-left border transition-all ${
                        formData.businessRelationType === "claim"
                          ? "border-indigo-500 bg-indigo-500/10 shadow-lg scale-[1.01]"
                          : "border-white/10 bg-zinc-950/40 hover:bg-zinc-950/60"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400">
                        <Award size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Claim / Link Business</h4>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          Search through existing FindUsOnWeb registered directories and link that existing asset with your profile.
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="space-y-2 mt-4">
                    <label className="text-xs font-semibold text-zinc-300">
                      {formData.businessRelationType === "register" ? "Preferred Business Name" : "Search & Select Registered Company"}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.businessSearchQuery}
                        onChange={(e) => updateField("businessSearchQuery", e.target.value)}
                        placeholder={formData.businessRelationType === "register" ? "Enter business name" : "Type keywords to search registered listings..."}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <Search className="absolute left-3.5 top-3.5 text-zinc-500" size={14} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Business Profile */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-300">Business Name</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => updateField("businessName", e.target.value)}
                      placeholder="e.g. Apex Global Solutions Ltd"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Primary Industry Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Technology">Technology & Software</option>
                      <option value="Retail">Retail & E-commerce</option>
                      <option value="Healthcare">Healthcare & Bio-Pharma</option>
                      <option value="Consulting">Consulting & Agency</option>
                      <option value="Marketing">Marketing & Advertising</option>
                      <option value="Finance">Finance & Investment</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Website URL</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => updateField("website", e.target.value)}
                      placeholder="https://www.company.com"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-zinc-300">Short Corporate Biography / Summary</label>
                    <textarea
                      value={formData.businessDescription}
                      onChange={(e) => updateField("businessDescription", e.target.value)}
                      placeholder="Briefly state what your company specializes in, your core capabilities..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Company Registration Number</label>
                    <input
                      type="text"
                      value={formData.regNumber}
                      onChange={(e) => updateField("regNumber", e.target.value)}
                      placeholder="e.g. UK-9876543"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Products and Services */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Core Services Description</label>
                    <textarea
                      value={formData.offeringDescription}
                      onChange={(e) => updateField("offeringDescription", e.target.value)}
                      placeholder="Outline the various products or services you map to the portal, or plan to showcase..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Main Product/Service Name</label>
                      <input
                        type="text"
                        value={formData.mainProductName}
                        onChange={(e) => updateField("mainProductName", e.target.value)}
                        placeholder="e.g. Apex Core CRM Server"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Pricing Model</label>
                      <input
                        type="text"
                        value={formData.pricingModel}
                        onChange={(e) => updateField("pricingModel", e.target.value)}
                        placeholder="e.g. Flat-rate Annual / Custom Quote"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-300">Target Audience / Persona</label>
                      <input
                        type="text"
                        value={formData.targetAudience}
                        onChange={(e) => updateField("targetAudience", e.target.value)}
                        placeholder="e.g. Small to Medium sized logistics agencies based in the UK"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Brand Kit */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">Establish corporate colors and upload branding materials.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Primary Brand Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.brandColorPrimary}
                          onChange={(e) => updateField("brandColorPrimary", e.target.value)}
                          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent shrink-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.brandColorPrimary}
                          onChange={(e) => updateField("brandColorPrimary", e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Secondary Accent Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.brandColorSecondary}
                          onChange={(e) => updateField("brandColorSecondary", e.target.value)}
                          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent shrink-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.brandColorSecondary}
                          onChange={(e) => updateField("brandColorSecondary", e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Brand Slogan / Tagline</label>
                    <input
                      type="text"
                      value={formData.slogan}
                      onChange={(e) => updateField("slogan", e.target.value)}
                      placeholder="e.g. Empowering Local Logistics Dynamically"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>

                  {/* Simulated Upload Component */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Upload Brand Logo</label>
                    <div className="border border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-5 bg-zinc-950/40 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer relative"
                      onClick={() => updateField("logoFileName", "logo_corporate_asset.png")}
                    >
                      <Upload className="text-zinc-500" size={24} />
                      {formData.logoFileName ? (
                        <div className="space-y-1">
                          <p className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
                            <Check size={12} /> {formData.logoFileName}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateField("logoFileName", "");
                            }}
                            className="text-[10px] text-zinc-500 hover:text-rose-400 underline"
                          >
                            Remove and upload another
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-white">Click to simulate logo drop</p>
                          <p className="text-[10px] text-zinc-500 mt-1">Supports transparent PNG, SVG files up to 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Business Intents */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">
                    What are your main business objectives or intents? (Select all that apply)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "find-clients", label: "Find New Customers & Leads" },
                      { key: "funding", label: "Secure Funding or Capital Investment" },
                      { key: "recruit", label: "Expand Corporate Team / Recruitment" },
                      { key: "publicity", label: "Enhance Brand Authority & PR" },
                      { key: "networking", label: "Network with Industry Peers" },
                      { key: "optimization", label: "Optimize Corporate Expenses" },
                    ].map((item) => {
                      const isSelected = formData.intents.includes(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleToggleItem("intents", item.key)}
                          className={`flex items-center justify-between p-4 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 text-white font-bold"
                              : "border-white/10 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-950/60"
                          }`}
                        >
                          <span>{item.label}</span>
                          <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-white/20"
                          }`}>
                            {isSelected && <Check size={10} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 7: My Business Goals */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Short-Term Target (Next 1-3 Months)</label>
                    <textarea
                      value={formData.goalShortTerm}
                      onChange={(e) => updateField("goalShortTerm", e.target.value)}
                      placeholder="e.g. Generate 50 qualified high-touch B2B leads from the regional portal."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Mid-Term Target (Next 6-12 Months)</label>
                    <textarea
                      value={formData.goalMidTerm}
                      onChange={(e) => updateField("goalMidTerm", e.target.value)}
                      placeholder="e.g. Launch the mobile app and secure three commercial enterprise partners."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Long-Term Corporate Vision (3-5 Years)</label>
                    <textarea
                      value={formData.goalLongTerm}
                      onChange={(e) => updateField("goalLongTerm", e.target.value)}
                      placeholder="e.g. Expand services into North America and establish full carbon-offset operations."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 8: My Focus Area */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">Identify your single highest-priority operational focus area.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "Lead Generation & Sales",
                      "Product R&D & Engineering",
                      "Talent Acquisition & HR",
                      "Marketing & Public Relations",
                      "Capital Raising & Investments",
                      "Compliance, Risk & Legal",
                    ].map((area) => {
                      const isSelected = formData.focusArea === area;
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => updateField("focusArea", area)}
                          className={`p-4 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 text-white font-bold scale-[1.01]"
                              : "border-white/10 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-950/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{area}</span>
                            <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-white/20"
                            }`}>
                              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 9: Key Business Challenges */}
              {currentStep === 8 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">What major challenges or bottlenecks do you face? (Select multiple)</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "Lack of Marketing Budget",
                      "Difficulty Finding High-Intent Leads",
                      "Technical Integration Barriers",
                      "High Monthly Operational Overheads",
                      "Fierce Competitor Saturation",
                      "Supplier & Logistics Blockers",
                    ].map((challenge) => {
                      const isSelected = formData.challenges.includes(challenge);
                      return (
                        <button
                          key={challenge}
                          type="button"
                          onClick={() => handleToggleItem("challenges", challenge)}
                          className={`flex items-center justify-between p-4 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 text-white font-bold"
                              : "border-white/10 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-950/60"
                          }`}
                        >
                          <span>{challenge}</span>
                          <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-white/20"
                          }`}>
                            {isSelected && <Check size={10} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 10: Department Cost Center */}
              {currentStep === 9 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">Map an initial corporate department to coordinate event billing.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Department Name</label>
                      <select
                        value={formData.deptName}
                        onChange={(e) => updateField("deptName", e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Marketing">Marketing & Comms</option>
                        <option value="Sales">Sales & Growth</option>
                        <option value="Engineering">R&D & Engineering</option>
                        <option value="HR">Human Resources</option>
                        <option value="Finance">Finance & Administration</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Cost Center Code</label>
                      <input
                        type="text"
                        value={formData.deptCostCenterCode}
                        onChange={(e) => updateField("deptCostCenterCode", e.target.value)}
                        placeholder="e.g. CC-MKT-808"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Annual Budget Allocation (£)</label>
                      <input
                        type="number"
                        value={formData.deptBudget}
                        onChange={(e) => updateField("deptBudget", e.target.value)}
                        placeholder="e.g. 150000"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Main Department Priority</label>
                      <input
                        type="text"
                        value={formData.deptPriority}
                        onChange={(e) => updateField("deptPriority", e.target.value)}
                        placeholder="e.g. Q4 Brand Awareness Push"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 11: Business Briefing */}
              {currentStep === 10 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Briefing Document Title</label>
                    <input
                      type="text"
                      value={formData.briefingTitle}
                      onChange={(e) => updateField("briefingTitle", e.target.value)}
                      placeholder="e.g. Executive Summary Q3"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Briefing Overview</label>
                    <textarea
                      value={formData.briefingOverview}
                      onChange={(e) => updateField("briefingOverview", e.target.value)}
                      placeholder="Provide a formal description for corporate sponsors or visitors."
                      rows={2}
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Key Strategic Assets</label>
                      <input
                        type="text"
                        value={formData.strategicAssets}
                        onChange={(e) => updateField("strategicAssets", e.target.value)}
                        placeholder="e.g. Proprietary Routing Algorithms"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Competitive Edge</label>
                      <input
                        type="text"
                        value={formData.competitiveEdge}
                        onChange={(e) => updateField("competitiveEdge", e.target.value)}
                        placeholder="e.g. Zero-lag API sync guarantees"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 12: Elevator Pitch */}
              {currentStep === 11 && (
                <div className="space-y-4">
                  <p className="text-xs text-indigo-400 font-bold italic">
                    "If you had 30 seconds inside an elevator with an investor, how would you pitch?"
                  </p>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">The Hook (Opening line)</label>
                    <input
                      type="text"
                      value={formData.pitchHook}
                      onChange={(e) => updateField("pitchHook", e.target.value)}
                      placeholder="e.g. Did you know 60% of logistics trucks run half-empty?"
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Problem Statement</label>
                      <textarea
                        value={formData.pitchProblem}
                        onChange={(e) => updateField("pitchProblem", e.target.value)}
                        placeholder="What big issue do you target?"
                        rows={2}
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Solution Statement</label>
                      <textarea
                        value={formData.pitchSolution}
                        onChange={(e) => updateField("pitchSolution", e.target.value)}
                        placeholder="How do you solve this elegantly?"
                        rows={2}
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Call to Action (CTA)</label>
                    <input
                      type="text"
                      value={formData.pitchCallToAction}
                      onChange={(e) => updateField("pitchCallToAction", e.target.value)}
                      placeholder="e.g. Schedule a demo at Stand 12 to see Apex CRM live."
                      className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 13: Key Driving Factor */}
              {currentStep === 12 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">What specific driving factors led you to join this business community?</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "Scaling B2B Partnerships",
                      "Attracting Active Investors",
                      "Expanding Regional Brand Awareness",
                      "Showcasing Live Service Capabilities",
                      "Attending Exclusive Trade Expositions",
                      "Utilizing Multi-channel SEO Listings",
                    ].map((factor) => {
                      const isSelected = formData.drivingFactors.includes(factor);
                      return (
                        <button
                          key={factor}
                          type="button"
                          onClick={() => handleToggleItem("drivingFactors", factor)}
                          className={`flex items-center justify-between p-4 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/10 text-white font-bold"
                              : "border-white/10 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-950/60"
                          }`}
                        >
                          <span>{factor}</span>
                          <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-white/20"
                          }`}>
                            {isSelected && <Check size={10} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 14: My Listing Adverts */}
              {currentStep === 13 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">Setup an event advertising slot that will showcase in portal rotations.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Advert Heading</label>
                      <input
                        type="text"
                        value={formData.advertHeading}
                        onChange={(e) => updateField("advertHeading", e.target.value)}
                        placeholder="e.g. Try Apex CRM Server Free"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Advert Subheading / Call-out</label>
                      <input
                        type="text"
                        value={formData.advertSubheading}
                        onChange={(e) => updateField("advertSubheading", e.target.value)}
                        placeholder="e.g. Get 20% Off during the Expo!"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-300">Advert Body Text</label>
                      <textarea
                        value={formData.advertBody}
                        onChange={(e) => updateField("advertBody", e.target.value)}
                        placeholder="Briefly describe the promotion..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-300">Target Destination Link (URL)</label>
                      <input
                        type="url"
                        value={formData.advertTargetUrl}
                        onChange={(e) => updateField("advertTargetUrl", e.target.value)}
                        placeholder="https://www.company.com/expo-deal"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 15: My Expense Overheads */}
              {currentStep === 14 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">Provide approximate budgetary overheads for context mapping.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Monthly Fixed Overheads (£)</label>
                      <input
                        type="number"
                        value={formData.fixedOverheads}
                        onChange={(e) => updateField("fixedOverheads", e.target.value)}
                        placeholder="e.g. 12000"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Variable Marketing Budget (£)</label>
                      <input
                        type="number"
                        value={formData.variableBudget}
                        onChange={(e) => updateField("variableBudget", e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-300">Expense Reduction Targets & Strategic Focus</label>
                      <textarea
                        value={formData.expenseReductionTarget}
                        onChange={(e) => updateField("expenseReductionTarget", e.target.value)}
                        placeholder="e.g. Plan to consolidate subscription SaaS spend by 15% next quarter."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-300">Primary Expense Categories</label>
                      <input
                        type="text"
                        value={formData.expenseCategories}
                        onChange={(e) => updateField("expenseCategories", e.target.value)}
                        placeholder="e.g. Digital Ads, Trade Show Booth Design, Logistics Staffing"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 16: Financial Planning */}
              {currentStep === 15 && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300">Outline commercial and sales expectations.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Target Annual Revenue (£)</label>
                      <input
                        type="number"
                        value={formData.targetRevenue}
                        onChange={(e) => updateField("targetRevenue", e.target.value)}
                        placeholder="e.g. 1200000"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Estimated Cost of Sales (%)</label>
                      <input
                        type="number"
                        value={formData.costOfSalesPercent}
                        onChange={(e) => updateField("costOfSalesPercent", e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Target Profit Margin (%)</label>
                      <input
                        type="number"
                        value={formData.expectedMarginPercent}
                        onChange={(e) => updateField("expectedMarginPercent", e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Funding Requirements (£)</label>
                      <input
                        type="number"
                        value={formData.fundingRequired}
                        onChange={(e) => updateField("fundingRequired", e.target.value)}
                        placeholder="e.g. 250000"
                        className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 17: My Business Card */}
              {currentStep === 16 && (
                <div className="space-y-6">
                  <p className="text-xs text-zinc-300">
                    Design and configure your digital business card which is accessible by event visitors.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Left: Card inputs */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-300">Select Card Style Theme</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "dark-glow", label: "Dark Glow" },
                            { id: "peach-luxury", label: "Peach Gold" },
                            { id: "minimal-light", label: "Clean Light" },
                          ].map((theme) => (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => updateField("cardLayout", theme.id)}
                              className={`py-2 px-3 rounded-lg text-center text-[11px] font-bold border transition-all ${
                                formData.cardLayout === theme.id
                                  ? "border-indigo-500 bg-indigo-500/10 text-white"
                                  : "border-white/10 bg-zinc-950/40 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {theme.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-300">Card Slogan / Subtitle</label>
                        <input
                          type="text"
                          value={formData.cardTagline}
                          onChange={(e) => updateField("cardTagline", e.target.value)}
                          placeholder="e.g. Next-Gen Enterprise Solutions"
                          className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-300">Corporate Address</label>
                        <input
                          type="text"
                          value={formData.cardDisplayAddress}
                          onChange={(e) => updateField("cardDisplayAddress", e.target.value)}
                          placeholder="e.g. Canary Wharf, London, UK"
                          className="w-full px-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Right: Dynamic Interactive Live Card Preview */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-indigo-400 uppercase tracking-widest">Live Digital Card Preview</label>
                      <div className={`p-6 rounded-2xl border aspect-[1.6/1] flex flex-col justify-between shadow-2xl transition-all duration-300 relative overflow-hidden ${
                        formData.cardLayout === "dark-glow"
                          ? "bg-zinc-950 text-white border-indigo-500/30 shadow-[0_4px_30px_rgb(var(--color-indigo-500-rgb) / 0.2)]"
                          : formData.cardLayout === "peach-luxury"
                          ? "bg-warm-bg text-zinc-900 border-warm-border shadow-[0_4px_30px_rgb(var(--color-warm-border-rgb) / 0.3)]"
                          : "bg-white text-zinc-900 border-zinc-200 shadow-xl"
                      }`}>
                        {/* Style accent circles */}
                        <div className={`absolute -right-12 -top-12 w-28 h-28 rounded-full blur-2xl opacity-40 ${
                          formData.cardLayout === "dark-glow"
                            ? "bg-indigo-500"
                            : "bg-pink-500"
                        }`} />

                        {/* Top Header */}
                        <div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              formData.cardLayout === "dark-glow" ? "text-indigo-400" : "text-warm-text"
                            }`}>
                              {formData.businessName || "Apex Global Solutions"}
                            </span>
                            <span className="text-[9px] font-medium opacity-60">
                              {formData.category}
                            </span>
                          </div>
                          <p className="text-[9px] italic opacity-75 mt-1">
                            {formData.cardTagline || "Powering Digital Innovations Globally"}
                          </p>
                        </div>

                        {/* Middle info */}
                        <div className="my-2">
                          <h4 className="text-sm font-black tracking-tight">
                            {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : "John Smith"}
                          </h4>
                          <p className="text-[10px] opacity-75 font-semibold">
                            {formData.jobTitle || "Managing Director"}
                          </p>
                        </div>

                        {/* Bottom coordinates */}
                        <div className="text-[8px] space-y-1 opacity-70 border-t border-current/10 pt-2">
                          {formData.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={8} /> <span>{formData.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Mail size={8} /> <span>{formData.email || "john.smith@company.com"}</span>
                          </div>
                          {formData.website && (
                            <div className="flex items-center gap-1.5">
                              <Globe size={8} /> <span>{formData.website}</span>
                            </div>
                          )}
                          {formData.cardDisplayAddress && (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={8} /> <span>{formData.cardDisplayAddress}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 18: Finish */}
              {currentStep === 17 && (
                <div className="flex flex-col items-center justify-center text-center py-6 space-y-5">
                  <div className="h-16 w-16 bg-gradient-to-tr from-emerald-400 to-teal-500 text-zinc-950 rounded-full flex items-center justify-center shadow-lg shadow-emerald-400/20">
                    <CheckCircle size={36} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">Onboarding Completed!</h4>
                    <p className="text-xs text-zinc-400 mt-2 max-w-md leading-relaxed">
                      Congratulations! You have fulfilled the FindUsOnWeb comprehensive 18-step onboarding. All your business records, brand assets, parameters, and digital cards are now registered.
                    </p>
                  </div>

                  {/* Summary of credentials */}
                  <div className="w-full max-w-lg rounded-2xl border border-white/5 bg-zinc-950/40 p-5 text-left space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest border-b border-white/5 pb-2">Registered Details Summary</h5>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase">Corporate Entity</span>
                        <span className="text-white font-bold">{formData.businessName || "Registered Business"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase">Contact Person</span>
                        <span className="text-white font-bold">{(formData.firstName + " " + formData.lastName).trim() || "John Smith"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase">Primary Category</span>
                        <span className="text-white font-bold">{formData.category}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase">Job Title</span>
                        <span className="text-white font-bold">{formData.jobTitle || "Managing Director"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Complete Action buttons */}
                  <div className="flex gap-4">
                    <a
                      href="/members/user_event_summary"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Check size={14} /> Go to Member Dashboard
                    </a>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* =====================================================
              BOTTOM ACTIONS BAR
          ====================================================== */}
          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                currentStep === 0
                  ? "opacity-30 cursor-not-allowed text-zinc-500"
                  : "bg-zinc-800 text-white hover:bg-zinc-700"
              }`}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            {currentStep < TABS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
              >
                Save and Next <ChevronRight size={14} />
              </button>
            ) : (
              <a
                href="/members/user_event_summary"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-lg"
              >
                Finish <Check size={14} />
              </a>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
