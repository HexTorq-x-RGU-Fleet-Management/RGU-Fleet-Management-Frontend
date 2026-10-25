import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/cameras?view=recorders');
}
