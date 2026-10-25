import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAppState } from '../state/AppState';
import SampleReport from '../ui/SampleReport';
import { RealReportView } from '../ui/RealReportView';
export default function Report() {
  const { id, sample } = useLocalSearchParams<{ id?: string; sample?: string }>();
  const state = useAppState();
  const panel = state.panels.find(item => item.id === id);
  if (panel && !panel.synthetic) return <RealReportView key={panel.id} panel={panel} />;
  if (!id && sample !== '1') return <Redirect href="/report-import" />;
  return <SampleReport />;
}
