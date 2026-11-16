import { partsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

// onCreate handler for a part <Select>: typing a name that doesn't exist
// offers "＋ Create" and creates the part on the spot. Admin only (POST /parts
// is admin-only on the backend) -- returns undefined for everyone else, so
// the Select stays a plain search.
//
//   const createPart = useCreatePart((part) => setParts((prev) => [...prev, part]));
//   <Select onCreate={createPart} createLabel={t('common.create')} ... />
export const useCreatePart = (onCreated) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return undefined;
  return async (name) => {
    const res = await partsAPI.create({ name: name.trim() });
    const part = res.data.data;
    onCreated?.(part);
    return part.id;
  };
};

export default useCreatePart;
