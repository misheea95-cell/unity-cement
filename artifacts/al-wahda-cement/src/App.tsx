import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  FileUp,
  LockKeyhole,
  Search,
  ShieldCheck,
  UploadCloud,
  ArrowUpLeft,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import {
  getGetAdminSummaryQueryKey,
  getQueryRemittanceQueryKey,
  useGetAdminSummary,
  useImportRemittances,
  useQueryRemittance,
  type Remittance,
  type RemittanceImportInput,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import companyLogo from '@assets/FB_IMG_1788600273707_1788604800753.jpg';

const queryClient = new QueryClient();

function BrandMark() {
  return (
    <div className="relative flex h-12 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] border border-white/80 bg-white shadow-[0_10px_24px_rgba(19,63,85,.2)]" aria-label="شعار أسمنت الوحدة">
      <img src={companyLogo} alt="شعار أسمنت الوحدة" className="h-full w-full object-cover object-top" />
    </div>
  );
}

function PageHeader({ admin = false }: { admin?: boolean }) {
  return (
    <header className="relative z-10 border-b border-border/70 bg-white/65 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3.5">
          <BrandMark />
          <div>
            <div className="font-serif text-lg font-bold leading-none tracking-[-.02em] text-primary sm:text-xl" data-testid="text-brand-title">
              أسمنت الوحدة
            </div>
            <div className="mt-1 text-[11px] font-medium tracking-[.08em] text-muted-foreground" data-testid="text-brand-slogan">
              رؤية جديدة لصناعة الأسمنت
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-white/70 px-3.5 py-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-4 text-accent" strokeWidth={1.8} />
            <span>خدمة داخلية موثوقة</span>
          </div>
          {admin ? (
            <Link href="/" className="focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-secondary" data-testid="link-public-search">
              الاستعلام العام
              <ArrowUpLeft className="size-3.5" />
            </Link>
          ) : (
            <Link href="/admin" className="focus-ring flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90" data-testid="link-admin">
              <LockKeyhole className="size-3.5" />
              دخول الإدارة
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          <div className="flex size-9 items-center justify-center rounded-full border border-border bg-white/60 text-primary">
            <ShieldCheck className="size-4 text-accent" />
          </div>
          {admin ? (
            <Link href="/" className="focus-ring rounded-full border border-primary/10 bg-white/70 px-3 py-2 text-[11px] font-bold text-primary" data-testid="link-public-search-mobile">
              الاستعلام العام
            </Link>
          ) : (
            <Link href="/admin" className="focus-ring flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground" data-testid="link-admin-mobile">
              <LockKeyhole className="size-3.5" />
              الإدارة
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function PageFooter() {
  return (
    <footer className="relative z-10 mx-auto mt-auto w-full max-w-7xl px-5 pb-6 pt-10 sm:px-8 lg:px-12">
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-5 text-center text-[11px] font-medium text-muted-foreground sm:flex-row sm:text-right">
        <span data-testid="text-footer">جميع الحقوق محفوظة © شركة أسمنت الوحدة.</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent" />
            <span>التحقق يتم عبر كود الموظف فقط</span>
          </span>
          <Link href="/admin" className="focus-ring rounded-md px-1.5 py-1 font-bold text-primary transition-colors hover:bg-secondary" data-testid="link-admin-footer">
            دخول الإدارة
          </Link>
        </div>
      </div>
    </footer>
  );
}

function SearchSkeleton() {
  return (
    <div className="mt-7 rounded-[1.5rem] border border-border/70 bg-white/65 p-5 sm:p-7" aria-label="جاري التحقق">
      <div className="skeleton-shimmer h-5 w-28 rounded-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="skeleton-shimmer h-20 rounded-xl" />
        <div className="skeleton-shimmer h-20 rounded-xl" />
        <div className="skeleton-shimmer h-20 rounded-xl" />
        <div className="skeleton-shimmer h-20 rounded-xl" />
      </div>
    </div>
  );
}

function RemittanceResult({ result, onNewSearch }: { result: Remittance; onNewSearch: () => void }) {
  const details = [
    { label: 'اسم المستلم', value: result.beneficiary, test: 'beneficiary' },
    { label: 'رقم الحوالة', value: result.transferNumber, test: 'transfer-number', ltr: true },
    { label: 'العملة', value: result.currency, test: 'currency', ltr: true },
    { label: 'المرسل', value: result.sender, test: 'sender' },
  ];

  return (
    <section className="reveal-up mt-7 overflow-hidden rounded-[1.5rem] border border-accent/25 bg-white shadow-[0_22px_65px_rgba(21,85,105,.12)]" aria-live="polite" data-testid="status-remittance-found">
      <div className="flex items-center justify-between gap-4 bg-primary px-5 py-4 text-primary-foreground sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <CheckCircle2 className="size-5" strokeWidth={2.2} />
          </div>
          <div>
            <span className="block text-[10px] font-semibold tracking-[.16em] text-sky-200/75">نتيجة التحقق</span>
            <strong className="mt-0.5 block text-base font-bold" data-testid="badge-remittance-found">الحوالة متاحة</strong>
          </div>
        </div>
        <span className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] text-sky-100/80 sm:inline-flex">بيانات خاصة</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
        {details.map((detail) => (
          <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3.5" key={detail.test}>
            <div className="text-[11px] font-semibold text-muted-foreground">{detail.label}</div>
            <div className={`mt-1.5 text-[15px] font-bold text-foreground ${detail.ltr ? 'font-mono tracking-wide' : ''}`} dir={detail.ltr ? 'ltr' : 'auto'} data-testid={`text-${detail.test}`}>
              {detail.value}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border/70 bg-slate-50/70 px-5 py-3.5 sm:px-6">
        <span className="text-[11px] leading-5 text-muted-foreground">تم عرض نتيجة واحدة مطابقة للكود المدخل.</span>
        <button type="button" onClick={onNewSearch} className="focus-ring shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-secondary" data-testid="button-new-search">
          بحث جديد
        </button>
      </div>
    </section>
  );
}

function NotFoundState({ onNewSearch }: { onNewSearch: () => void }) {
  return (
    <section className="reveal-up mt-7 rounded-[1.5rem] border border-border bg-white/80 p-6 text-center shadow-[0_18px_50px_rgba(30,80,100,.07)] sm:p-9" aria-live="polite" data-testid="status-remittance-not-found">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Search className="size-6" strokeWidth={1.7} />
      </div>
      <span className="mt-5 inline-flex rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground" data-testid="badge-remittance-not-found">غير متاح</span>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted-foreground" data-testid="text-remittance-not-found">عذرًا، لم يتم العثور على حوالة مرتبطة بهذا الكود.</p>
      <button type="button" onClick={onNewSearch} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0" data-testid="button-search-again">
        <RefreshCw className="size-4" />
        بحث جديد
      </button>
    </section>
  );
}

function SearchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="reveal-up mt-7 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-right" role="alert" data-testid="status-search-error">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
      <div className="flex-1">
        <div className="text-sm font-bold text-red-900">تعذر إتمام التحقق</div>
        <p className="mt-1 text-xs leading-6 text-red-800/75">تحقق من الاتصال وحاول مرة أخرى. لا يتم حفظ كود الموظف على هذه الصفحة.</p>
      </div>
      <button type="button" onClick={onRetry} className="focus-ring shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-800 hover:bg-red-100" data-testid="button-retry-search">إعادة المحاولة</button>
    </div>
  );
}

function Home() {
  const [inputCode, setInputCode] = useState('');
  const [submittedCode, setSubmittedCode] = useState('');
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const queryParams = useMemo(() => ({ employeeCode: submittedCode }), [submittedCode]);
  const query = useQueryRemittance(queryParams, {
    query: {
      enabled: Boolean(submittedCode),
      queryKey: getQueryRemittanceQueryKey(queryParams),
      retry: false,
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = inputCode.trim();
    if (!normalized) {
      setValidationError('أدخل كود الموظف للمتابعة.');
      inputRef.current?.focus();
      return;
    }
    setValidationError('');
    setSubmittedCode(normalized);
  };

  const newSearch = () => {
    setSubmittedCode('');
    setInputCode('');
    setValidationError('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const errorStatus = (query.error as { status?: number } | undefined)?.status;
  const hasNotFound = query.isError && errorStatus === 404;

  return (
    <div dir="rtl" className="concrete-surface page-enter flex min-h-[100dvh] flex-col overflow-hidden">
      <PageHeader />
      <main className="relative z-0 mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-5 pt-8 sm:px-8 sm:pt-12 lg:px-12 lg:pt-16">
        <div className="pointer-events-none absolute -left-28 top-12 size-72 rounded-full border border-accent/10 sm:size-96" />
        <div className="pointer-events-none absolute -left-14 top-28 size-44 rounded-full border border-accent/10 sm:size-64" />
        <div className="grid flex-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)] lg:gap-20">
          <section className="reveal-up order-1 pt-2 lg:order-2 lg:pt-10">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="text-[11px] font-bold tracking-[.18em] text-primary/65">بوابة الموظفين</span>
            </div>
            <h1 className="text-balance max-w-2xl font-serif text-[2.2rem] font-bold leading-[1.25] tracking-[-.04em] text-primary sm:text-5xl lg:text-[4rem]" data-testid="text-page-title">
              الاستعلام عن الحوالات المالية
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-8 text-muted-foreground sm:text-base" data-testid="text-page-subtitle">
              أدخل كود الموظف للتحقق من تفاصيل الحوالة
            </p>
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-3 border-t border-border/80 pt-5 text-[11px] font-medium text-muted-foreground sm:gap-8">
              <div className="flex items-start gap-2">
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>استعلام خاص<br />بكود واحد فقط</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>لا يتم عرض<br />أي سجلات أخرى</span>
              </div>
            </div>
          </section>

          <section className="reveal-up reveal-delay-1 order-2 lg:order-1">
            <div className="cement-grid relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-primary p-1 shadow-[0_28px_80px_rgba(18,62,84,.18)]">
              <div className="absolute -left-16 -top-20 size-56 rounded-full border border-accent/20" />
              <div className="absolute -left-3 -top-7 size-32 rounded-full border border-accent/20" />
              <div className="relative rounded-[1.45rem] border border-white/10 bg-primary/95 p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold tracking-[.17em] text-sky-200/70">تحقق آمن</div>
                    <h2 className="mt-1.5 text-xl font-bold text-white">بيانات الحوالة</h2>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                    <Search className="size-5" />
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="mt-8" noValidate>
                  <label htmlFor="employee-code" className="mb-2.5 block text-xs font-semibold text-sky-100/80">رقم كود الموظف</label>
                  <div className={`flex items-center rounded-xl border bg-white/10 p-1.5 transition-colors ${validationError ? 'border-red-300/80' : 'border-white/20 focus-within:border-accent'}`}>
                    <input
                      ref={inputRef}
                      id="employee-code"
                      value={inputCode}
                      onChange={(event) => { setInputCode(event.target.value); setValidationError(''); }}
                      placeholder="أدخل الكود هنا"
                      className="focus-ring min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-sky-100/40"
                      dir="ltr"
                      autoComplete="off"
                      aria-invalid={Boolean(validationError)}
                      data-testid="input-employee-code"
                    />
                    <button type="submit" disabled={query.isFetching} className="focus-ring flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-3 text-xs font-bold text-accent-foreground transition-all hover:bg-accent/90 disabled:cursor-wait disabled:opacity-70 sm:px-5" data-testid="button-search">
                      {query.isFetching ? <span className="size-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" /> : <Search className="size-4" />}
                      بحث
                    </button>
                  </div>
                  {validationError ? <p className="mt-2 text-xs font-medium text-red-200" data-testid="text-search-validation">{validationError}</p> : <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-5 text-sky-100/50"><LockKeyhole className="size-3" />لن نطلب أي معلومات إضافية.</p>}
                </form>
              </div>
            </div>
            {query.isFetching ? <SearchSkeleton /> : query.data ? <RemittanceResult result={query.data} onNewSearch={newSearch} /> : hasNotFound ? <NotFoundState onNewSearch={newSearch} /> : null}
            {query.isError && !hasNotFound ? <SearchError onRetry={() => query.refetch()} /> : null}
          </section>
        </div>
      </main>
      <PageFooter />
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="skeleton-shimmer h-32 rounded-2xl" />
      <div className="skeleton-shimmer h-32 rounded-2xl" />
      <div className="skeleton-shimmer h-32 rounded-2xl" />
    </div>
  );
}

function Admin() {
  const [adminKey, setAdminKey] = useState('');
  const [activeAdminKey, setActiveAdminKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<RemittanceImportInput | null>(null);
  const [fileLabel, setFileLabel] = useState('');
  const [fileError, setFileError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const summaryQuery = useGetAdminSummary({
    query: {
      enabled: Boolean(activeAdminKey),
      queryKey: getGetAdminSummaryQueryKey(),
      retry: false,
    },
    request: activeAdminKey ? { headers: { 'x-admin-key': activeAdminKey } } : undefined,
  });
  const importMutation = useImportRemittances({
    request: activeAdminKey ? { headers: { 'x-admin-key': activeAdminKey } } : undefined,
  });

  const unlockAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (adminKey.trim()) {
      setImportMessage('');
      setActiveAdminKey(adminKey.trim());
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension !== 'csv' && extension !== 'xlsx') {
      setFileError('اختر ملف CSV أو XLSX فقط.');
      setSelectedFile(null);
      setFileLabel('');
      return;
    }
    setFileError('');
    setImportMessage('');
    const reader = new FileReader();
    reader.onerror = () => setFileError('تعذر قراءة الملف. حاول اختيار الملف مرة أخرى.');
    reader.onload = () => {
      const result = String(reader.result ?? '');
      if (extension === 'csv') {
        setSelectedFile({ fileName: file.name, content: result, encoding: 'utf-8' });
      } else {
        const base64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result;
        setSelectedFile({ fileName: file.name, content: base64, encoding: 'base64' });
      }
      setFileLabel(file.name);
    };
    if (extension === 'csv') reader.readAsText(file, 'UTF-8');
    else reader.readAsDataURL(file);
  };

  const submitImport = () => {
    if (!selectedFile || importMutation.isPending) return;
    setImportMessage('');
    importMutation.mutate({ data: selectedFile }, {
      onSuccess: (result) => {
        setImportMessage(`تم استيراد ${result.importedCount.toLocaleString('ar-EG')} سجل بنجاح.`);
        setSelectedFile(null);
        setFileLabel('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        queryClient.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
      },
    });
  };

  const summary = summaryQuery.data;
  const accessError = summaryQuery.isError;

  return (
    <div dir="rtl" className="concrete-surface page-enter flex min-h-[100dvh] flex-col">
      <PageHeader admin />
      <main className="relative mx-auto w-full max-w-7xl flex-1 px-5 pb-8 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="reveal-up">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[.15em] text-primary/60">
              <span className="size-1.5 rounded-full bg-accent" />
              مساحة الإدارة
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-[-.035em] text-primary sm:text-4xl" data-testid="text-admin-title">إدارة بيانات الحوالات</h1>
            <p className="mt-2 text-sm text-muted-foreground">استبدال ملف الشهر ومراجعة حالة قاعدة البيانات.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white/60 px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
            <LockKeyhole className="size-4 text-accent" />
            وصول محمي بمفتاح الإدارة
          </div>
        </div>

        {!activeAdminKey || accessError ? (
          <section className="reveal-up max-w-xl rounded-[1.5rem] border border-border bg-white/80 p-5 shadow-[0_18px_55px_rgba(25,80,100,.08)] sm:p-7">
            <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary"><KeyRound className="size-5" /></div>
            <h2 className="mt-5 text-xl font-bold text-primary">الدخول إلى مساحة الإدارة</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">أدخل مفتاح الإدارة للوصول إلى ملخص البيانات ورفع ملف الحوالات. لا يتم حفظ المفتاح في المتصفح.</p>
            <form onSubmit={unlockAdmin} className="mt-6" noValidate>
              <label htmlFor="admin-key" className="mb-2 block text-xs font-bold text-foreground">مفتاح الإدارة</label>
              <div className="flex gap-2">
                <input id="admin-key" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} className="focus-ring min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none" placeholder="أدخل المفتاح" autoComplete="off" data-testid="input-admin-key" />
                <button type="submit" disabled={!adminKey.trim() || summaryQuery.isFetching} className="focus-ring flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-admin-unlock">
                  <LockKeyhole className="size-4" />
                  تحقق
                </button>
              </div>
            </form>
            {accessError ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-xs font-medium text-red-800" role="alert" data-testid="status-admin-error"><AlertCircle className="size-4 shrink-0" />مفتاح الإدارة غير صالح أو تعذر الاتصال بالخدمة.</div> : null}
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <section className="reveal-up rounded-[1.5rem] border border-border bg-white/80 p-5 shadow-[0_18px_55px_rgba(25,80,100,.07)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold tracking-[.1em] text-accent"><UploadCloud className="size-4" /> تحديث الملف الشهري</div>
                  <h2 className="mt-2 text-xl font-bold text-primary">استيراد ملف الحوالات</h2>
                </div>
                <FileSpreadsheet className="size-7 text-primary/20" />
              </div>
              <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">يتم تحليل الملف على الخادم واستبدال مجموعة البيانات الحالية. لن يتم عرض السجلات أو إتاحتها في المتصفح.</p>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} className="hidden" data-testid="input-remittance-file" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="focus-ring mt-6 flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-accent/40 bg-secondary/45 px-5 text-center transition-colors hover:border-accent hover:bg-secondary" data-testid="button-choose-file">
                <FileUp className="size-7 text-accent" strokeWidth={1.6} />
                <span className="mt-2 text-sm font-bold text-primary">{fileLabel || 'اختر ملف CSV أو XLSX'}</span>
                <span className="mt-1 text-[11px] text-muted-foreground">{fileLabel ? 'اضغط لاختيار ملف آخر' : 'قراءة آمنة UTF-8 أو base64'}</span>
              </button>
              {fileError ? <p className="mt-3 text-xs font-medium text-red-700" role="alert" data-testid="status-file-error">{fileError}</p> : null}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[11px] text-muted-foreground">الرفع يستبدل الملف السابق بالكامل.</span>
                <button type="button" onClick={submitImport} disabled={!selectedFile || importMutation.isPending} className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-import-remittances">
                  {importMutation.isPending ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <UploadCloud className="size-4" />}
                  {importMutation.isPending ? 'جارٍ الاستيراد' : 'استيراد الملف'}
                </button>
              </div>
              {importMessage ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs font-bold text-emerald-800" role="status" data-testid="status-import-success"><CheckCircle2 className="size-4" />{importMessage}</div> : null}
              {importMutation.isError ? <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-xs font-medium text-red-800" role="alert" data-testid="status-import-error"><AlertCircle className="size-4" />تعذر استيراد الملف. راجع صيغته ومفتاح الإدارة وحاول مرة أخرى.</div> : null}
            </section>

            <section className="reveal-up reveal-delay-1">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-primary">ملخص قاعدة البيانات</h2>
                <Database className="size-4 text-accent" />
              </div>
              {summaryQuery.isFetching ? <AdminSkeleton /> : summary ? (
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-border bg-white/80 p-5" data-testid="card-record-count">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground"><span>عدد السجلات</span><Database className="size-4 text-accent" /></div>
                    <div className="mt-4 font-serif text-4xl font-bold text-primary" dir="ltr" data-testid="text-record-count">{summary.recordCount.toLocaleString('ar-EG')}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">سجل متاح للتحقق</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white/80 p-5" data-testid="card-file-name">
                    <div className="text-xs font-semibold text-muted-foreground">آخر ملف مستورد</div>
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary" dir="ltr" data-testid="text-file-name"><FileSpreadsheet className="size-4 shrink-0 text-accent" />{summary.fileName || 'لا يوجد ملف'}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">اسم الملف المحفوظ</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white/80 p-5" data-testid="card-updated-at">
                    <div className="text-xs font-semibold text-muted-foreground">آخر تحديث</div>
                    <div className="mt-4 text-sm font-bold text-primary" dir="ltr" data-testid="text-updated-at">{summary.updatedAt ? new Date(summary.updatedAt).toLocaleString('ar-EG') : 'لم يتم التحديث بعد'}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">وقت آخر استبدال للبيانات</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-white/55 p-8 text-center text-sm text-muted-foreground" data-testid="empty-admin-summary">لا توجد بيانات لعرضها بعد.</div>
              )}
            </section>
          </div>
        )}
      </main>
      <PageFooter />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <RoutedErrorBoundary>
          <Router />
        </RoutedErrorBoundary>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;