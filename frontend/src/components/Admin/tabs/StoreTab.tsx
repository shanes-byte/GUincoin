import { StoreProduct, PurchaseOrder } from '../../../services/api';

interface StoreTabProps {
  // Purchase Orders
  pendingPurchases: PurchaseOrder[];
  allPurchases: PurchaseOrder[];
  purchasesLoading: boolean;
  purchasesTab: 'pending' | 'all';
  fulfillingId: string | null;
  fulfillForm: { trackingNumber: string; notes: string };
  onPurchasesTabChange: (tab: 'pending' | 'all') => void;
  onLoadPurchases: () => void;
  onFulfillingIdChange: (id: string | null) => void;
  onFulfillFormChange: (form: { trackingNumber: string; notes: string }) => void;
  onFulfillPurchase: (purchaseId: string) => void;

  // Store Products
  storeProducts: StoreProduct[];
  storeProductsLoading: boolean;
  togglingProductId: string | null;
  deletingProductId: string | null;
  onLoadStoreProducts: () => void;
  onToggleProduct: (productId: string) => void;
  onDeleteProduct: (productId: string, productName: string) => void;

  // Custom Product
  customProductForm: { name: string; description: string; coinValue: string };
  customProductImage: File | null;
  customProductLoading: boolean;
  onCustomProductFormChange: (form: { name: string; description: string; coinValue: string }) => void;
  onCustomProductImageChange: (file: File | null) => void;
  onCreateProduct: (e: React.FormEvent) => void;

  // Amazon Import
  amazonProductUrl: string;
  amazonProductLoading: boolean;
  amazonProductResult: string | null;
  amazonListUrl: string;
  amazonListLimit: string;
  amazonListLoading: boolean;
  amazonListResult: {
    requested: number;
    totalFound: number;
    results: Array<{ asin: string; status: string; message?: string }>;
  } | null;
  seedProductLoading: boolean;
  onAmazonProductUrlChange: (url: string) => void;
  onAmazonListUrlChange: (url: string) => void;
  onAmazonListLimitChange: (limit: string) => void;
  onImportAmazonProduct: (e: React.FormEvent) => void;
  onImportAmazonList: (e: React.FormEvent) => void;
  onSeedProduct: () => void;
}

export default function StoreTab({
  pendingPurchases,
  allPurchases,
  purchasesLoading,
  purchasesTab,
  fulfillingId,
  fulfillForm,
  onPurchasesTabChange,
  onLoadPurchases,
  onFulfillingIdChange,
  onFulfillFormChange,
  onFulfillPurchase,
  storeProducts,
  storeProductsLoading,
  togglingProductId,
  deletingProductId,
  onLoadStoreProducts,
  onToggleProduct,
  onDeleteProduct,
  customProductForm,
  customProductImage,
  customProductLoading,
  onCustomProductFormChange,
  onCustomProductImageChange,
  onCreateProduct,
  amazonProductUrl,
  amazonProductLoading,
  amazonProductResult,
  amazonListUrl,
  amazonListLimit,
  amazonListLoading,
  amazonListResult,
  seedProductLoading,
  onAmazonProductUrlChange,
  onAmazonListUrlChange,
  onAmazonListLimitChange,
  onImportAmazonProduct,
  onImportAmazonList,
  onSeedProduct,
}: StoreTabProps) {
  return (
    <div className="space-y-6">
      {/* Purchase Orders */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Purchase Orders</h2>
          <button
            onClick={onLoadPurchases}
            disabled={purchasesLoading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {purchasesLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                onPurchasesTabChange('pending');
                onLoadPurchases();
              }}
              className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                purchasesTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Pending ({pendingPurchases.length})
            </button>
            <button
              onClick={() => {
                onPurchasesTabChange('all');
                onLoadPurchases();
              }}
              className={`whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                purchasesTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              All Purchases
            </button>
          </nav>
        </div>

        {purchasesLoading && purchasesTab === 'pending' && pendingPurchases.length === 0 ? (
          <div className="text-center py-6 text-gray-500">Loading purchases...</div>
        ) : purchasesTab === 'pending' && pendingPurchases.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No pending purchases.</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(purchasesTab === 'pending' ? pendingPurchases : allPurchases).map((purchase) => (
              <div key={purchase.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {purchase.product.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          purchase.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : purchase.status === 'fulfilled'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {purchase.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {purchase.employee?.name || 'Unknown'} • {purchase.priceGuincoin.toFixed(2)} Guincoin
                    </p>
                    {purchase.shippingAddress && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        📍 {purchase.shippingAddress}
                      </p>
                    )}
                  </div>
                  {purchase.status === 'pending' && (
                    <div className="ml-4">
                      {fulfillingId === purchase.id ? (
                        <div className="w-64 space-y-2">
                          <input
                            type="text"
                            placeholder="Tracking number (optional)"
                            value={fulfillForm.trackingNumber}
                            onChange={(e) =>
                              onFulfillFormChange({
                                ...fulfillForm,
                                trackingNumber: e.target.value,
                              })
                            }
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                          <textarea
                            placeholder="Notes (optional)"
                            value={fulfillForm.notes}
                            onChange={(e) =>
                              onFulfillFormChange({ ...fulfillForm, notes: e.target.value })
                            }
                            rows={2}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                onFulfillingIdChange(null);
                                onFulfillFormChange({ trackingNumber: '', notes: '' });
                              }}
                              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => onFulfillPurchase(purchase.id)}
                              className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => onFulfillingIdChange(purchase.id)}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Fulfill
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Store Products */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Store Products</h2>
        <p className="text-sm text-gray-500 mb-6">
          Add custom products or import from Amazon. Amazon imports depend on the product page being publicly accessible.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Custom Product</h3>
              <button
                type="button"
                onClick={onSeedProduct}
                disabled={seedProductLoading}
                className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 disabled:bg-gray-200 disabled:text-gray-500"
              >
                {seedProductLoading ? 'Seeding...' : 'Seed Sample'}
              </button>
            </div>
            <form onSubmit={onCreateProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={customProductForm.name}
                  onChange={(e) =>
                    onCustomProductFormChange({ ...customProductForm, name: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={customProductForm.description}
                  onChange={(e) =>
                    onCustomProductFormChange({ ...customProductForm, description: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Guincoin Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customProductForm.coinValue}
                  onChange={(e) =>
                    onCustomProductFormChange({ ...customProductForm, coinValue: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Product Image
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif"
                  onChange={(e) => onCustomProductImageChange(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={customProductLoading}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {customProductLoading ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Amazon Product Link</h3>
              <form onSubmit={onImportAmazonProduct} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Product URL
                  </label>
                  <input
                    type="url"
                    value={amazonProductUrl}
                    onChange={(e) => onAmazonProductUrlChange(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    placeholder="https://www.amazon.com/dp/..."
                    required
                  />
                </div>

                {amazonProductResult && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    {amazonProductResult}
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={amazonProductLoading}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {amazonProductLoading ? 'Importing...' : 'Import Product'}
                  </button>
                </div>
              </form>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Amazon List Import</h3>
              <form onSubmit={onImportAmazonList} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    List URL
                  </label>
                  <input
                    type="url"
                    value={amazonListUrl}
                    onChange={(e) => onAmazonListUrlChange(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    placeholder="https://www.amazon.com/hz/wishlist/..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={amazonListLimit}
                    onChange={(e) => onAmazonListLimitChange(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>

                {amazonListResult && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    Imported {amazonListResult.results.filter((item) => item.status === 'imported').length}{' '}
                    of {amazonListResult.requested} items. Total found: {amazonListResult.totalFound}.
                  </div>
                )}

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={amazonListLoading}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {amazonListLoading ? 'Importing...' : 'Import List'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Manage Store Products */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Manage Products</h2>
          <button
            onClick={onLoadStoreProducts}
            disabled={storeProductsLoading}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {storeProductsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {storeProductsLoading && storeProducts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">Loading products...</div>
        ) : storeProducts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No products found. Add products using the forms above.
            <button
              onClick={onLoadStoreProducts}
              className="block mx-auto mt-2 text-blue-600 hover:text-blue-700"
            >
              Load Products
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {storeProducts.map((product) => (
                  <tr key={product.id} className={!product.isActive ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {product.imageUrls[0] ? (
                          <img
                            src={product.imageUrls[0]}
                            alt={product.name}
                            className="h-10 w-10 object-cover rounded"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                            No img
                          </div>
                        )}
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {product.priceGuincoin.toFixed(2)} GC
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        product.source === 'custom'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {product.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onToggleProduct(product.id)}
                          disabled={togglingProductId === product.id}
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            product.isActive
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-50`}
                        >
                          {togglingProductId === product.id
                            ? '...'
                            : product.isActive
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product.id, product.name)}
                          disabled={deletingProductId === product.id}
                          className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                        >
                          {deletingProductId === product.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
