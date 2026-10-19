import { router } from 'expo-router';

import { AssignmentForm } from '../../components/AssignmentForm';
import { api } from '../../lib/api';
import { defaultDue } from '../../lib/format';

export default function NewAssignmentScreen() {
  return (
    <AssignmentForm
      initial={{ courseName: '', title: '', dueAt: defaultDue(), memo: '' }}
      submitLabel="저장"
      onSubmit={async (input) => {
        await api.createAssignment(input);
        router.back();
      }}
    />
  );
}
