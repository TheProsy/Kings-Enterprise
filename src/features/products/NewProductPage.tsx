import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ProductForm } from '@/features/products/ProductForm';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/constants';

export function NewProductPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Product"
        description="Register a building material and set up its variations, pricing, and opening stock."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(ROUTES.APP_PRODUCTS)}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Inventory
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
        <ProductForm
          onClose={() => navigate(ROUTES.APP_PRODUCTS)}
          onSuccess={() => navigate(ROUTES.APP_PRODUCTS)}
        />
      </div>
    </div>
  );
}
