import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div dir="rtl" className="concrete-surface flex min-h-[100dvh] items-center justify-center p-5">
      <div className="w-full max-w-md rounded-[1.5rem] border border-border bg-white/80 p-8 text-center shadow-[0_18px_55px_rgba(25,80,100,.08)]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary"><AlertCircle className="size-6" /></div>
        <h1 className="mt-5 font-serif text-2xl font-bold text-primary">الصفحة غير متاحة</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">تعذر العثور على الصفحة المطلوبة.</p>
        <Link href="/" className="focus-ring mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground" data-testid="link-return-home">العودة إلى الاستعلام</Link>
      </div>
    </div>
  );
}
