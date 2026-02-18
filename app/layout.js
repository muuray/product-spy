import './globals.css';

export const metadata = {
  title: 'ProductSpy — AI-Powered Product Research Agent',
  description: 'Discover trending products, analyze market saturation, find unbranded alternatives. Powered by AI that learns continuously.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
