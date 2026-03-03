import { SafetyDashboard } from '@/app/components/SafetyDashboard';
import { ErrorBoundary } from '@/app/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <SafetyDashboard />
    </ErrorBoundary>
  );
}
