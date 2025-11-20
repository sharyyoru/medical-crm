"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type Service = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  base_price: number | null;
};

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [creatingService, setCreatingService] = useState(false);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"categories" | "services">(
    "categories",
  );

  const [categorySearch, setCategorySearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServiceDescription, setEditServiceDescription] = useState("");
  const [editServicePrice, setEditServicePrice] = useState("");
  const [editServiceCategoryId, setEditServiceCategoryId] = useState<string>(
    "",
  );

  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const { data: categoryData, error: categoryError } = await supabaseClient
          .from("service_categories")
          .select("id, name, description, sort_order")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (!isMounted) return;

        if (categoryError || !categoryData) {
          setError(categoryError?.message ?? "Failed to load service categories.");
          setCategories([]);
          setServices([]);
          setLoading(false);
          return;
        }

        const categoryRows = categoryData as ServiceCategory[];
        setCategories(categoryRows);

        const { data: serviceData, error: serviceError } = await supabaseClient
          .from("services")
          .select(
            "id, category_id, name, description, is_active, base_price",
          )
          .order("created_at", { ascending: true });

        if (!isMounted) return;

        if (serviceError || !serviceData) {
          setError(serviceError?.message ?? "Failed to load services.");
          setServices([]);
          setLoading(false);
          return;
        }

        const serviceRows = (serviceData as any[]).map((row) => ({
          id: row.id as string,
          category_id: row.category_id as string,
          name: row.name as string,
          description: (row.description as string | null) ?? null,
          is_active: (row.is_active as boolean) ?? true,
          base_price:
            row.base_price !== null && row.base_price !== undefined
              ? Number(row.base_price)
              : null,
        }));

        setServices(serviceRows as Service[]);

        if (!selectedCategoryId && categoryRows.length > 0) {
          setSelectedCategoryId(categoryRows[0].id);
        }

        setLoading(false);
      } catch {
        if (!isMounted) return;
        setError("Failed to load services data.");
        setCategories([]);
        setServices([]);
        setLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryMessage("Please enter a category name.");
      return;
    }

    try {
      setCreatingCategory(true);
      setCategoryMessage(null);

      const sortOrder =
        categories.length > 0
          ? Math.max(...categories.map((c) => c.sort_order ?? 1)) + 1
          : 1;

      const { data, error } = await supabaseClient
        .from("service_categories")
        .insert({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
          sort_order: sortOrder,
        })
        .select("id, name, description, sort_order")
        .single();

      if (error || !data) {
        setCategoryMessage(error?.message ?? "Failed to create category.");
        return;
      }

      const created = data as ServiceCategory;
      setCategories((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setNewCategoryName("");
      setNewCategoryDescription("");
      if (!selectedCategoryId) {
        setSelectedCategoryId(created.id);
      }
      setCategoryMessage("Category created.");
    } catch {
      setCategoryMessage("Failed to create category.");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleCreateService(event: FormEvent) {
    event.preventDefault();

    if (!selectedCategoryId) {
      setServiceMessage("Please select a category.");
      return;
    }
    if (!newServiceName.trim()) {
      setServiceMessage("Please enter a service name.");
      return;
    }

    let priceValue: number | null = null;
    if (newServicePrice.trim()) {
      const parsed = Number(newServicePrice.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0) {
        setServiceMessage("Please enter a valid CHF price.");
        return;
      }
      priceValue = parsed;
    }

    try {
      setCreatingService(true);
      setServiceMessage(null);

      const { data, error } = await supabaseClient
        .from("services")
        .insert({
          category_id: selectedCategoryId,
          name: newServiceName.trim(),
          description: newServiceDescription.trim() || null,
          base_price: priceValue,
          is_active: true,
        })
        .select("id, category_id, name, description, is_active, base_price")
        .single();

      if (error || !data) {
        setServiceMessage(error?.message ?? "Failed to create service.");
        return;
      }

      const created = data as any;
      const newRow: Service = {
        id: created.id as string,
        category_id: created.category_id as string,
        name: created.name as string,
        description: (created.description as string | null) ?? null,
        is_active: (created.is_active as boolean) ?? true,
        base_price:
          created.base_price !== null && created.base_price !== undefined
            ? Number(created.base_price)
            : null,
      };

      setServices((prev) => [...prev, newRow]);
      setNewServiceName("");
      setNewServiceDescription("");
      setNewServicePrice("");
      setServiceMessage("Service created.");
    } catch {
      setServiceMessage("Failed to create service.");
    } finally {
      setCreatingService(false);
    }
  }

  function handleStartEditCategory(category: ServiceCategory) {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description ?? "");
  }

  function handleCancelEditCategory() {
    setEditingCategoryId(null);
    setEditCategoryName("");
    setEditCategoryDescription("");
    setCategoryMessage(null);
  }

  async function handleSaveCategory(categoryId: string) {
    if (!editCategoryName.trim()) {
      setCategoryMessage("Please enter a category name.");
      return;
    }

    try {
      setSavingCategoryId(categoryId);
      setCategoryMessage(null);

      const { data, error } = await supabaseClient
        .from("service_categories")
        .update({
          name: editCategoryName.trim(),
          description: editCategoryDescription.trim() || null,
        })
        .eq("id", categoryId)
        .select("id, name, description, sort_order")
        .single();

      if (error || !data) {
        setCategoryMessage(error?.message ?? "Failed to update category.");
        return;
      }

      const updated = data as ServiceCategory;
      setCategories((prev) =>
        prev
          .map((category) =>
            category.id === categoryId ? updated : category,
          )
          .sort((a, b) => a.sort_order - b.sort_order),
      );

      setCategoryMessage("Category updated.");
      setEditingCategoryId(null);
      setEditCategoryName("");
      setEditCategoryDescription("");
    } catch {
      setCategoryMessage("Failed to update category.");
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    const hasServices = services.some((service) => service.category_id === categoryId);
    if (hasServices) {
      setCategoryMessage(
        "Cannot delete category with existing services. Delete or reassign those services first.",
      );
      return;
    }

    try {
      setDeletingCategoryId(categoryId);
      setCategoryMessage(null);

      const { error } = await supabaseClient
        .from("service_categories")
        .delete()
        .eq("id", categoryId);

      if (error) {
        setCategoryMessage(error.message ?? "Failed to delete category.");
        return;
      }

      setCategories((prev) => prev.filter((category) => category.id !== categoryId));

      if (selectedCategoryId === categoryId) {
        const remaining = categories.filter((category) => category.id !== categoryId);
        setSelectedCategoryId(remaining[0]?.id ?? "");
      }

      setCategoryMessage("Category deleted.");
    } catch {
      setCategoryMessage("Failed to delete category.");
    } finally {
      setDeletingCategoryId(null);
    }
  }

  function handleStartEditService(service: Service) {
    setEditingServiceId(service.id);
    setEditServiceName(service.name);
    setEditServiceDescription(service.description ?? "");
    setEditServiceCategoryId(service.category_id);
    setEditServicePrice(
      service.base_price !== null && service.base_price !== undefined
        ? String(service.base_price)
        : "",
    );
  }

  function handleCancelEditService() {
    setEditingServiceId(null);
    setEditServiceName("");
    setEditServiceDescription("");
    setEditServiceCategoryId("");
    setEditServicePrice("");
    setServiceMessage(null);
  }

  async function handleSaveService(serviceId: string) {
    if (!editServiceName.trim()) {
      setServiceMessage("Please enter a service name.");
      return;
    }

    let priceValue: number | null = null;
    if (editServicePrice.trim()) {
      const parsed = Number(editServicePrice.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0) {
        setServiceMessage("Please enter a valid CHF price.");
        return;
      }
      priceValue = parsed;
    }

    try {
      setSavingServiceId(serviceId);
      setServiceMessage(null);

      const { data, error } = await supabaseClient
        .from("services")
        .update({
          name: editServiceName.trim(),
          description: editServiceDescription.trim() || null,
          category_id: editServiceCategoryId,
          base_price: priceValue,
        })
        .eq("id", serviceId)
        .select("id, category_id, name, description, is_active, base_price")
        .single();

      if (error || !data) {
        setServiceMessage(error?.message ?? "Failed to update service.");
        return;
      }

      const updated = data as any;
      const updatedRow: Service = {
        id: updated.id as string,
        category_id: updated.category_id as string,
        name: updated.name as string,
        description: (updated.description as string | null) ?? null,
        is_active: (updated.is_active as boolean) ?? true,
        base_price:
          updated.base_price !== null && updated.base_price !== undefined
            ? Number(updated.base_price)
            : null,
      };

      setServices((prev) =>
        prev.map((service) =>
          service.id === serviceId ? updatedRow : service,
        ),
      );

      setServiceMessage("Service updated.");
      setEditingServiceId(null);
      setEditServiceName("");
      setEditServiceDescription("");
      setEditServiceCategoryId("");
      setEditServicePrice("");
    } catch {
      setServiceMessage("Failed to update service.");
    } finally {
      setSavingServiceId(null);
    }
  }

  async function handleDeleteService(serviceId: string) {
    try {
      setDeletingServiceId(serviceId);
      setServiceMessage(null);

      const { error } = await supabaseClient
        .from("services")
        .delete()
        .eq("id", serviceId);

      if (error) {
        setServiceMessage(error.message ?? "Failed to delete service.");
        return;
      }

      setServices((prev) => prev.filter((service) => service.id !== serviceId));
      setServiceMessage("Service deleted.");
    } catch {
      setServiceMessage("Failed to delete service.");
    } finally {
      setDeletingServiceId(null);
    }
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c] as const));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Services</h1>
        <p className="text-sm text-slate-500">
          Define service categories and services offered by the clinic. Prices are in CHF.
        </p>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1 py-0.5 text-[11px] text-slate-500">
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={
            "rounded-full px-2 py-0.5 text-[11px] " +
            (activeTab === "categories"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900")
          }
        >
          Categories
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("services")}
          className={
            "rounded-full px-2 py-0.5 text-[11px] " +
            (activeTab === "services"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900")
          }
        >
          Services
        </button>
      </div>

      {activeTab === "categories" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <h2 className="text-sm font-medium text-slate-800">New category</h2>
            <p className="mt-1 text-xs text-slate-500">
              Create high-level groupings such as Aesthetics or Reconstructive.
            </p>
            <form onSubmit={handleCreateCategory} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Category name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="Aesthetics"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Description (optional)
                </label>
                <textarea
                  value={newCategoryDescription}
                  onChange={(event) =>
                    setNewCategoryDescription(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  rows={2}
                  placeholder="Aesthetic and cosmetic procedures"
                />
              </div>
              {categoryMessage ? (
                <p className="text-xs text-slate-500">{categoryMessage}</p>
              ) : null}
              <button
                type="submit"
                disabled={creatingCategory}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingCategory ? "Creating..." : "Create category"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
            <h2 className="text-sm font-medium text-slate-800">Categories</h2>
            <p className="mt-1 text-xs text-slate-500">
              Existing service categories.
            </p>
            <div className="mt-2">
              <input
                type="text"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            {loading ? (
              <p className="mt-2 text-xs text-slate-500">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No categories yet.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-xs text-slate-700">
                {categories
                  .slice()
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .filter((category) => {
                    const term = categorySearch.trim().toLowerCase();
                    if (!term) return true;
                    const haystack = `${category.name} ${
                      category.description ?? ""
                    }`.toLowerCase();
                    return haystack.includes(term);
                  })
                  .map((category) => {
                    const isEditing = editingCategoryId === category.id;
                    const isSaving = savingCategoryId === category.id;
                    const isDeleting = deletingCategoryId === category.id;

                    if (isEditing) {
                      return (
                        <li
                          key={category.id}
                          className="space-y-1 rounded-md bg-slate-50/70 px-2 py-2"
                        >
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(event) =>
                                  setEditCategoryName(event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                              <textarea
                                value={editCategoryDescription}
                                onChange={(event) =>
                                  setEditCategoryDescription(event.target.value)
                                }
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div className="flex flex-col items-end gap-1 text-[11px]">
                              <span className="text-slate-400">#{category.sort_order}</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveCategory(category.id)}
                                  disabled={isSaving}
                                  className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-0.5 font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditCategory}
                                  disabled={isSaving}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-0.5 font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleDeleteCategory(category.id)}
                                disabled={isDeleting || isSaving}
                                className="mt-1 inline-flex items-center text-[11px] font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={category.id}
                        className="flex items-center justify-between rounded-md bg-slate-50/70 px-2 py-1"
                      >
                        <div>
                          <div className="font-medium text-slate-900">
                            {category.name}
                          </div>
                          {category.description ? (
                            <div className="text-[11px] text-slate-500">
                              {category.description}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px]">
                          <span className="text-slate-400">
                            #{category.sort_order}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditCategory(category)}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteCategory(category.id)}
                              disabled={deletingCategoryId === category.id}
                              className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2 py-0.5 font-medium text-red-600 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingCategoryId === category.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "services" ? (
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium text-slate-800">New service</h2>
              <p className="text-xs text-slate-500">
                Add individual services under a category. Prices are stored in CHF.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateService} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  {categories.length === 0 ? (
                    <option value="">No categories yet</option>
                  ) : (
                    categories
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Service name
                </label>
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(event) => setNewServiceName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="Liposuction"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Description (optional)
                </label>
                <textarea
                  value={newServiceDescription}
                  onChange={(event) =>
                    setNewServiceDescription(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  rows={2}
                  placeholder="Short description of the service"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Price (CHF)
                </label>
                <div className="mt-1 flex rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-sm focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400">
                  <span className="inline-flex items-center px-2 text-[11px] text-slate-500">
                    CHF
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.05"
                    value={newServicePrice}
                    onChange={(event) => setNewServicePrice(event.target.value)}
                    className="flex-1 rounded-r-lg border-0 bg-transparent px-2 py-1.5 text-right outline-none"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Leave blank if price is variable or defined elsewhere.
                </p>
              </div>
            </div>

            {serviceMessage ? (
              <p className="text-xs text-slate-500">{serviceMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={creatingService}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingService ? "Creating..." : "Create service"}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Existing services
            </h3>
            <div className="mt-2">
              <input
                type="text"
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search services by name or category..."
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            {loading ? (
              <p className="mt-2 text-xs text-slate-500">Loading services...</p>
            ) : services.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No services yet.</p>
            ) : (
              <div className="mt-2 space-y-1 text-xs">
                {services
                  .filter((service) => {
                    const term = serviceSearch.trim().toLowerCase();
                    if (!term) return true;
                    const category = categoriesById.get(service.category_id);
                    const haystack = `${service.name} ${
                      service.description ?? ""
                    } ${category ? category.name : ""}`.toLowerCase();
                    return haystack.includes(term);
                  })
                  .map((service) => {
                    const category = categoriesById.get(service.category_id);
                    const isEditing = editingServiceId === service.id;
                    const isSaving = savingServiceId === service.id;
                    const isDeleting = deletingServiceId === service.id;

                    if (isEditing) {
                      return (
                        <div
                          key={service.id}
                          className="space-y-2 rounded-md bg-slate-50/70 px-2 py-2"
                        >
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editServiceName}
                                onChange={(event) =>
                                  setEditServiceName(event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                              <select
                                value={editServiceCategoryId}
                                onChange={(event) =>
                                  setEditServiceCategoryId(event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              >
                                {categories
                                  .slice()
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                              </select>
                              <textarea
                                value={editServiceDescription}
                                onChange={(event) =>
                                  setEditServiceDescription(event.target.value)
                                }
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div className="flex flex-col items-end gap-1 text-[11px]">
                              <span className="text-slate-500">
                                {category ? category.name : "Unknown category"}
                              </span>
                              <div className="mt-1 flex w-full rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-sm focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400">
                                <span className="inline-flex items-center px-2 text-[11px] text-slate-500">
                                  CHF
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.05"
                                  value={editServicePrice}
                                  onChange={(event) =>
                                    setEditServicePrice(event.target.value)
                                  }
                                  className="flex-1 rounded-r-lg border-0 bg-transparent px-2 py-1.5 text-right outline-none"
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveService(service.id)}
                                  disabled={isSaving}
                                  className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-0.5 font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditService}
                                  disabled={isSaving}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-0.5 font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleDeleteService(service.id)}
                                disabled={isDeleting || isSaving}
                                className="mt-1 inline-flex items-center text-[11px] font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={service.id}
                        className="flex items-center justify-between rounded-md bg-slate-50/70 px-2 py-1"
                      >
                        <div>
                          <div className="font-medium text-slate-900">
                            {service.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {category ? category.name : "Unknown category"}
                            {service.description
                              ? ` · ${service.description}`
                              : ""}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-700">
                          {service.base_price !== null ? (
                            <span>CHF {service.base_price.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-400">CHF —</span>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditService(service)}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteService(service.id)}
                              disabled={deletingServiceId === service.id}
                              className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2 py-0.5 font-medium text-red-600 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingServiceId === service.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {error ? (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
