# React Query Setup Guide

## Installation

React Query has been set up in the project. To complete the installation, run:

```bash
npm install @tanstack/react-query
```

## What's Been Set Up

### 1. React Query Provider (`lib/react-query-provider.tsx`)
- Configured QueryClient with optimal defaults
- 30-second stale time for queries
- 5-minute garbage collection time
- Disabled refetch on window focus
- Wrapped in the root layout

### 2. Custom Hooks Created

#### `hooks/use-projects.ts`
- `useProjects()` - Fetch all projects
- `useCreateProject()` - Create new project
- `useUpdateProject()` - Update existing project
- `useDeleteProject()` - Delete project

#### `hooks/use-employees.ts`
- `useEmployees()` - Fetch all employees
- `useCreateEmployee()` - Create new employee
- `useUpdateEmployee()` - Update existing employee
- `useDeleteEmployee()` - Delete employee

#### `hooks/use-tasks.ts`
- `useTasks()` - Fetch all tasks
- `useCreateTask()` - Create new task
- `useUpdateTask()` - Update existing task
- `useDeleteTask()` - Delete task

## Benefits of React Query

1. **Automatic Caching** - Data is cached and shared across components
2. **Background Refetching** - Keeps data fresh automatically
3. **Request Deduplication** - Multiple components requesting same data = 1 request
4. **Optimistic Updates** - UI updates immediately, syncs in background
5. **Error Handling** - Built-in retry logic and error states
6. **Loading States** - Built-in loading, error, and success states

## Migration Guide

### Before (useState + useEffect):
```tsx
const [employees, setEmployees] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/employees")
    .then(res => res.json())
    .then(data => {
      setEmployees(data);
      setLoading(false);
    });
}, []);
```

### After (React Query):
```tsx
const { data: employees, isLoading, error } = useEmployees();
```

### Example: Employee Management Component

Replace:
```tsx
const [employees, setEmployees] = useState<Employee[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetchEmployees();
}, []);

const fetchEmployees = async () => {
  setIsLoading(true);
  const res = await fetch("/api/employees");
  const data = await res.json();
  setEmployees(data);
  setIsLoading(false);
};
```

With:
```tsx
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/hooks/use-employees";

const { data: employees = [], isLoading, error } = useEmployees();
const createEmployee = useCreateEmployee();
const updateEmployee = useUpdateEmployee();
const deleteEmployee = useDeleteEmployee();

// Usage in handlers:
const handleCreate = async () => {
  await createEmployee.mutateAsync(employeeData);
  // Cache automatically invalidated and refetched!
};
```

## Next Steps

1. **Install React Query**: `npm install @tanstack/react-query`
2. **Migrate Components**: Start with high-traffic components:
   - `components/employee-management.tsx`
   - `components/unified-project-management.tsx`
   - `components/task-board.tsx`
3. **Remove Old State Management**: Remove manual useState/useEffect for data fetching
4. **Keep UI State**: Keep useState for UI-only state (dialogs, forms, etc.)

## Components to Migrate

Priority order:
1. ✅ `employee-management.tsx` - Simple, good starting point
2. ✅ `unified-project-management.tsx` - Complex, high impact
3. ✅ `task-board.tsx` - High traffic component
4. `job-management.tsx` - Medium complexity
5. `employee-project-center.tsx` - Employee view
6. `employee-dashboard.tsx` - Employee view

## Notes

- React Query works alongside your existing `useApiCache` hook
- Both can coexist during migration
- React Query provides better DevTools and more features
- Consider migrating from `useApiCache` to React Query gradually

