import { redirect } from 'next/navigation';

export function GET() {
  redirect(`${process.env.API_URL}/auth/google`);
}
