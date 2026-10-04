import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

export function PassportIcon(props: P) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden {...props}>
      <rect x="6.5" y="3" width="15" height="22" rx="1.6" fill="#3b5bdb" />
      <rect x="8.2" y="4.6" width="11.6" height="18.8" rx="0.8" stroke="#dbe4ff" strokeWidth="0.7" />
      <circle cx="14" cy="12.2" r="2.5" stroke="#f1f3f5" strokeWidth="0.9" />
      <path d="M10.2 18.2h7.6M11.2 20.2h5.6" stroke="#dbe4ff" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

export function TicketsIcon(props: P) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden {...props}>
      <path d="M8.2 8.4 17.6 5.6c.7-.2 1.4.2 1.6.9l2.6 8.2c.2.7-.2 1.4-.9 1.6l-9.4 2.8c-.7.2-1.4-.2-1.6-.9l-2.6-8.2c-.2-.7.2-1.4.9-1.6Z" fill="#e2b15a" />
      <path d="M11.4 9.2 18.8 7" stroke="#f8e7c0" strokeWidth="0.7" />
      <circle cx="13.2" cy="12.4" r="0.7" fill="#8a6230" />
      <path d="M10.6 12.8 16.2 11.2 18.4 18.2 12.8 19.8 10.6 12.8Z" fill="#c9923a" />
      <path d="M13.2 14.6h.1" stroke="#f6e4bc" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon(props: P) {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="currentColor" aria-hidden {...props}>
      <path d="M10.9091 0H1.36364C0.613636 0 0.00681817 0.613636 0.00681817 1.36364L0 10.1795C0 10.65 0.238636 11.0659 0.6 11.3114L5.2285 14.3951C5.77826 14.7614 6.49433 14.7612 7.04388 14.3946L11.6659 11.3114C12.0273 11.0659 12.2659 10.65 12.2659 10.1795L12.2727 1.36364C12.2727 0.613636 11.6591 0 10.9091 0ZM4.77273 10.2273L1.36364 6.81818L2.325 5.85682L4.77273 8.29773L9.94773 3.12273L10.9091 4.09091L4.77273 10.2273Z" />
    </svg>
  );
}

export function SearchIcon(props: P) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden {...props}>
      <path d="M8.33333 7.33333H7.80667L7.62 7.15333C8.27333 6.39333 8.66667 5.40667 8.66667 4.33333C8.66667 1.94 6.72667 0 4.33333 0C1.94 0 0 1.94 0 4.33333C0 6.72667 1.94 8.66667 4.33333 8.66667C5.40667 8.66667 6.39333 8.27333 7.15333 7.62L7.33333 7.80667V8.33333L10.6667 11.66L11.66 10.6667L8.33333 7.33333ZM4.33333 7.33333C2.67333 7.33333 1.33333 5.99333 1.33333 4.33333C1.33333 2.67333 2.67333 1.33333 4.33333 1.33333C5.99333 1.33333 7.33333 2.67333 7.33333 4.33333C7.33333 5.99333 5.99333 7.33333 4.33333 7.33333Z" />
    </svg>
  );
}

export function ChevronIcon({ open, ...props }: P & { open?: boolean }) {
  return (
    <svg
      fill="none"
      viewBox="0 0 18 16"
      aria-hidden
      className={`w-4 transition-transform ${open ? "" : "rotate-180"}`}
      {...props}
    >
      <path d="M13.5234 10L9.27344 6L5.02344 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function BoltBadge(props: P) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden {...props}>
      <circle cx="11" cy="11" r="11" fill="#35CC6D" />
      <path d="M10.6641 17H9.99747L10.6641 12.3333H8.3308C7.94414 12.3333 7.9508 12.12 8.07747 11.8933C8.20414 11.6667 8.1108 11.84 8.12414 11.8133C8.98414 10.2933 10.2775 8.02667 11.9975 5H12.6641L11.9975 9.66667H14.3308C14.6575 9.66667 14.7041 9.88667 14.6441 10.0067L14.5975 10.1067C11.9708 14.7 10.6641 17 10.6641 17Z" fill="white" />
    </svg>
  );
}

export function PlaneBadge(props: P) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden {...props}>
      <circle cx="11" cy="11" r="11" fill="#5079EA" />
      <path d="M5 15.2368H17V16.5H5V15.2368ZM15.6358 13.2474C16.1411 13.38 16.6589 13.0832 16.7979 12.5779C16.9305 12.0726 16.6337 11.5547 16.1284 11.4158L12.7747 10.5189L11.0316 4.82211L9.81263 4.5V9.72947L6.67368 8.88947L6.08632 7.42421L5.17053 7.17789V10.4432L15.6358 13.2474Z" fill="white" />
    </svg>
  );
}

export function DocBadge(props: P) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden {...props}>
      <circle cx="11" cy="11" r="11" fill="#EAA250" />
      <path d="M15.6 6.2H13.092C12.84 5.504 12.18 5 11.4 5C10.62 5 9.96 5.504 9.708 6.2H7.2C6.54 6.2 6 6.74 6 7.4V15.8C6 16.46 6.54 17 7.2 17H15.6C16.26 17 16.8 16.46 16.8 15.8V7.4C16.8 6.74 16.26 6.2 15.6 6.2ZM11.4 6.2C11.73 6.2 12 6.47 12 6.8C12 7.13 11.73 7.4 11.4 7.4C11.07 7.4 10.8 7.13 10.8 6.8C10.8 6.47 11.07 6.2 11.4 6.2ZM12.6 14.6H8.4V13.4H12.6V14.6ZM14.4 12.2H8.4V11H14.4V12.2ZM14.4 9.8H8.4V8.6H14.4V9.8Z" fill="white" />
    </svg>
  );
}

export function UmbrellaBadge(props: P) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden {...props}>
      <circle cx="11" cy="11" r="11" fill="#EA5083" />
      <path d="M11.751 12.7064L12.7044 11.753L16.998 16.0486L16.0466 17L11.751 12.7064ZM14.6132 8.88611L16.52 6.97931C13.8865 4.3458 9.61949 4.33913 6.98598 6.96598C9.60616 6.09925 12.5264 6.7993 14.6132 8.88611ZM6.96598 6.98598C4.33913 9.61949 4.3458 13.8865 6.97931 16.52L8.88611 14.6132C6.7993 12.5264 6.09925 9.60616 6.96598 6.98598ZM6.97931 6.97264L6.97264 6.97931C6.71929 8.98611 7.7527 11.5663 9.83951 13.6598L13.6598 9.83951C11.573 7.7527 8.98612 6.71929 6.97931 6.97264Z" fill="white" />
    </svg>
  );
}

export function WhatsAppIcon(props: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.43 9.43 0 0 1-1.45-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.9.99 6.68 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.45 9.44m8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.65l6.04-1.58a11.3 11.3 0 0 0 5.43 1.38h.01c6.26 0 11.36-5.1 11.36-11.37 0-3.03-1.18-5.89-3.33-8.03" />
    </svg>
  );
}

export function EmergencyIcon(props: P) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden {...props}>
      <path d="M7.439 6.695a.226.226 0 0 1-.068-.011L5.932 6.205a.216.216 0 0 1-.148-.205V2.576a.216.216 0 1 1 .432 0v3.268l1.291.43a.216.216 0 0 1-.068.42Z" fill="currentColor" />
      {[
        [6, 0.47], [3.235, 1.211], [1.211, 3.235], [0.47, 6], [1.211, 8.765], [3.235, 10.789],
        [6, 11.53], [8.765, 10.789], [10.789, 8.765], [11.53, 6], [10.789, 3.235], [8.765, 1.211],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.47" fill="currentColor" />
      ))}
    </svg>
  );
}

export function StarRow({ rating = 5, className }: { rating?: number; className?: string }) {
  return (
    <span className={`flex gap-0.5 ${className ?? ""}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`flex size-4 items-center justify-center ${i < rating ? "bg-[#00b67a]" : "bg-[#dcdce6]"}`}>
          <svg viewBox="0 0 24 24" className="size-3 fill-white" aria-hidden>
            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </span>
      ))}
    </span>
  );
}
