import { UsersDataTable } from '@/components/users/users-data-table';

export default function UsersPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Users</h1>
      <UsersDataTable />
    </div>
  );
}
