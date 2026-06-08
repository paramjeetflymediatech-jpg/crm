import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken');

  if (!token) {
    redirect('/login');
  } else {
    redirect('/dashboard');
  }
}
