function IconBase({ size = 20, className = '', children, ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {children}
    </svg>
  )
}

export const ArrowRight = (props) => <IconBase {...props}><path d="M5 12h14M13 6l6 6-6 6" /></IconBase>
export const ArrowUpRight = (props) => <IconBase {...props}><path d="M7 17 17 7M7 7h10v10" /></IconBase>
export const Menu = (props) => <IconBase {...props}><path d="M4 7h16M4 12h16M4 17h16" /></IconBase>
export const Close = (props) => <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" /></IconBase>
export const Search = (props) => <IconBase {...props}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></IconBase>
export const Ear = (props) => <IconBase {...props}><path d="M6 10a6 6 0 0 1 12 0c0 5-5 4-5 8a2 2 0 0 1-4 0" /><path d="M10 10a2 2 0 1 1 4 0c0 2-2 2-2 4" /></IconBase>
export const Message = (props) => <IconBase {...props}><path d="M20 15a4 4 0 0 1-4 4H8l-5 2 2-5a7 7 0 1 1 15-1Z" /></IconBase>
export const Target = (props) => <IconBase {...props}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></IconBase>
export const Book = (props) => <IconBase {...props}><path d="M4 5a3 3 0 0 1 3-3h12v17H7a3 3 0 0 0-3 3Z" /><path d="M4 5v17M9 6h6M9 10h6" /></IconBase>
export const Headphones = (props) => <IconBase {...props}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1ZM20 14h-3v6h2a1 1 0 0 0 1-1Z" /></IconBase>
export const Sliders = (props) => <IconBase {...props}><path d="M4 5h16M4 12h16M4 19h16" /><path d="M8 3v4M16 10v4M10 17v4" /></IconBase>
export const Check = (props) => <IconBase {...props}><path d="m5 12 4 4L19 6" /></IconBase>
export const Sparkles = (props) => <IconBase {...props}><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" /><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8ZM19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6Z" /></IconBase>
export const Clock = (props) => <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5h4" /></IconBase>
export const LogIn = (props) => <IconBase {...props}><path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></IconBase>
export const Heart = (props) => <IconBase {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></IconBase>
export const Lightbulb = (props) => <IconBase {...props}><path d="M9 18h6M10 22h4M8.5 15.5A7 7 0 1 1 15.5 15.5c-.8.6-1.2 1.4-1.3 2.5h-4.4c-.1-1.1-.5-1.9-1.3-2.5Z" /></IconBase>
export const Quote = (props) => <IconBase {...props}><path d="M8 10H4a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4M20 10h-4a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4" /></IconBase>
export const Wand = (props) => <IconBase {...props}><path d="m15 4 5 5L8 21l-5-5Z" /><path d="m6 14 5 5M6 3v3M4.5 4.5h3M18 16v4M16 18h4" /></IconBase>
export const Alert = (props) => <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 17h.01" /></IconBase>
export const HomeIcon = (props) => <IconBase {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></IconBase>
export const Instagram = (props) => <IconBase {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></IconBase>
export const Play = (props) => <IconBase {...props}><path d="m8 5 11 7-11 7Z" /></IconBase>
export const Asterisk = (props) => <IconBase {...props}><path d="M12 2v20M4 7l16 10M20 7 4 17" /></IconBase>
export const Repeat = (props) => <IconBase {...props}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></IconBase>
export const Notebook = (props) => <IconBase {...props}><rect x="6" y="3" width="14" height="18" rx="2" /><path d="M10 7h6M10 11h6M3 7h3M3 12h3M3 17h3" /></IconBase>
