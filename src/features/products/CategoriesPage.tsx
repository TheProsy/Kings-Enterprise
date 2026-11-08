import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { DataTable } from '@/components/tables/DataTable';
import { BUSINESS_ID, categoryService } from '@/services';
import { PERMISSIONS } from '@/constants';
import { useAuth } from '@/features/auth';
import { toast } from '@/lib/toast';
import type { Category } from '@/types';
import { Plus, Tag, Edit, Trash2 } from 'lucide-react';

export function CategoriesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = hasPermission(PERMISSIONS.PRODUCTS_EDIT);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await categoryService.list();
      setCategories(data);
    } catch (error) {
      console.error(error);
      toast('Could not load categories.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setShowForm(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setDescription(category.description || '');
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editing) {
        await categoryService.update(editing.id, {
          name: name.trim(),
          description: description.trim(),
        });
        toast('Category updated.', 'success');
      } else {
        await categoryService.create({
          businessId: BUSINESS_ID,
          name: name.trim(),
          description: description.trim(),
          active: true,
        });
        toast('Category added.', 'success');
      }
      setShowForm(false);
      setEditing(null);
      await loadData();
    } catch (error) {
      console.error(error);
      toast('Could not save the category. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (category: Category) => {
    if (!window.confirm(`Remove "${category.name}"? Products keep their history.`)) return;
    try {
      await categoryService.deactivate(category.id);
      toast('Category deactivated.', 'success');
      await loadData();
    } catch (error) {
      console.error(error);
      toast('Could not deactivate the category.', 'error');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Category',
      render: (cat: Category) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border/80 shadow-xs flex items-center justify-center text-brand">
            <Tag className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">{cat.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (cat: Category) => (
        <span className="text-text-secondary text-xs">{cat.description || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (cat: Category) => (
        <Badge variant={cat.active ? 'success' : 'danger'}>
          {cat.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (cat: Category) => (
        <div className="flex items-center justify-end gap-2">
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              {cat.active && (
                <Button size="sm" variant="ghost" onClick={() => deactivate(cat)}>
                  <Trash2 className="h-3 w-3 text-danger-fg" />
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Categories"
        description="Organise building materials into logical inventory groupings."
        action={
          canCreate ? (
            <Button onClick={openCreate} className="shadow-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Category
            </Button>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        emptyTitle="No categories created"
        emptyMessage="Create categories such as Cement, Iron Rods, Timber, Roofing, and Plumbing to organise your catalogue."
        mobileCardRender={(cat) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm text-text-primary">{cat.name}</p>
                <Badge variant={cat.active ? 'success' : 'danger'}>
                  {cat.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {cat.description && (
                <p className="text-xs text-text-secondary mt-1">{cat.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {canEdit && (
                <>
                  <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                    Edit
                  </Button>
                  {cat.active && (
                    <Button size="sm" variant="ghost" onClick={() => deactivate(cat)}>
                      <Trash2 className="h-3.5 w-3.5 text-danger-fg" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Category' : 'Add New Category'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Category Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Cement & Aggregates"
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editing ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
