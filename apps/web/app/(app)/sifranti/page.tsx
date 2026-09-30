"use client";

import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import type { CalendarCategory, Department, MachineType } from "@/lib/types";
import type { CalendarColor, DepartmentColor, FaultCategoryIcon } from "@servis-track/shared";
import { CALENDAR_COLORS } from "@/components/calendar/calendar-meta";
import { CategoryColorPicker } from "@/components/calendar/category-color-picker";
import { DEPARTMENT_COLORS, DepartmentColorPicker } from "@/components/department-badge";
import { ManagedList, type ManagedItem } from "@/components/managed-list";
import { ExternalCodesSection } from "@/components/external-codes";
import { PageHeader, SectionTitle } from "@/components/detail-parts";
import { ClipboardList, Cog, NotebookPen } from "@/components/icons";
import { CategoryIconPicker } from "@/components/knowledge/category-icon-picker";
import { zapisov } from "@/components/knowledge/kb-state";
import { useFaultCategories } from "@/lib/fault-categories";
import { machineCountLabel, taskCountLabel } from "@/lib/format";

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { data: types, refetch: refetchTypes } = useApi<MachineType[]>("/machine-types");
  const { data: departments, refetch: refetchDepartments } = useApi<Department[]>("/departments");
  const { data: categories, refetch: refetchCategories } = useApi<CalendarCategory[]>(
    isAdmin ? "/calendar/categories" : null,
  );
  const { data: faultCategories, refetch: refetchFaultCategories } = useFaultCategories();

  if (!isAdmin) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Ta stran je namenjena administratorjem.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Šifranti"
        description="Seznami, iz katerih se izbira po vsej aplikaciji. Spremembe veljajo takoj; ime, ki ga preimenujete, se zamenja povsod, kjer je uporabljeno."
      />
      <div className="grid gap-10 lg:grid-cols-2 xl:gap-x-12 xl:gap-y-10">
        <section className="min-w-0 space-y-4">
          <SectionTitle
            action={<span className="text-sm text-nav-foreground tabular-nums">{types?.length ?? 0}</span>}
          >
            Vrste sredstev
          </SectionTitle>
          <p className="text-sm text-nav-foreground">
            Kaj je posamezno sredstvo: tiskalnik, rezalnik, računalnik, viličar … Nove vrste
            dodate tukaj in so takoj na izbiro pri urejanju sredstva.
          </p>
          <ManagedList
            endpoint="/machine-types"
            items={types ?? []}
            onChanged={async () => {
            await refetchTypes();
            }}
            addPlaceholder="Naziv nove vrste"
            emptyText="Vrst še ni"
            countIcon={Cog}
            countLabel={machineCountLabel}
            addedToast="Vrsta dodana"
            renamedToast="Vrsta preimenovana"
            deletedToast="Vrsta izbrisana"
            deleteTitle="Brisanje vrste"
            deleteBody={(it: ManagedItem) => {
            const n = it._count?.machines ?? 0;
            return (
                <>
                  <span className="font-semibold text-primary">{it.name}</span>
                  {n > 0
                    ? ` bo odstranjena. Njenih ${n} ${machineCountLabel(n)} ostane, le brez vrste.`
                    : " bo odstranjena. Nobeno sredstvo je ne uporablja."}
                </>
              );
            }}
          />
        </section>

        <section className="min-w-0 space-y-4">
          <SectionTitle
            action={<span className="text-sm text-nav-foreground tabular-nums">{departments?.length ?? 0}</span>}
          >
            Oddelki
          </SectionTitle>
          <p className="text-sm text-nav-foreground">
            Edina razdelitev, ki jo uporablja celotna aplikacija: sredstva, ticketi in vnosi v
            bazi znanja kažejo na oddelek. Barva ga označi v tabelah.
          </p>
          <ManagedList
            endpoint="/departments"
            items={departments ?? []}
            onChanged={async () => {
            await refetchDepartments();
            }}
            addPlaceholder="Naziv novega oddelka"
            emptyText="Oddelkov še ni"
            countIcon={Cog}
            countLabel={machineCountLabel}
            addedToast="Oddelek dodan"
            renamedToast="Oddelek preimenovan"
            deletedToast="Oddelek izbrisan"
            deleteTitle="Brisanje oddelka"
            createExtra={() => ({
              color:
                DEPARTMENT_COLORS.find((c) => !(departments ?? []).some((d) => d.color === c)) ??
                "GRAY",
            })}
            renderLeading={(it, update, busy) => (
              <DepartmentColorPicker
                value={it.color as DepartmentColor | undefined}
                disabled={busy}
                onChange={(color) => update({ color }, "Barva spremenjena")}
              />
            )}
            deleteBody={(it: ManagedItem) => {
            const n = it._count?.machines ?? 0;
            return (
                <>
                  <span className="font-semibold text-primary">{it.name}</span>
                  {n > 0
                    ? ` bo odstranjen. Njegovih ${n} ${machineCountLabel(n)} se ohrani, le da izgubijo oddelek, in z njimi tudi njihovi ticketi.`
                    : " bo odstranjen. Nič drugega se ne izbriše; kar kaže nanj, preprosto izgubi oddelek."}
                </>
              );
            }}
          />
        </section>

        <section className="min-w-0 space-y-4">
          <SectionTitle
            action={<span className="text-sm text-nav-foreground tabular-nums">{categories?.length ?? 0}</span>}
          >
            Kategorije opravil
          </SectionTitle>
          <p className="text-sm text-nav-foreground">
            Vrste opravil v koledarju: servis, vzdrževanje, pregled, naročilo … Barva pove
            kategorijo na prvi pogled v mreži koledarja.
          </p>
          <ManagedList
            endpoint="/calendar/categories"
            items={categories ?? []}
            onChanged={async () => {
            await refetchCategories();
            }}
            addPlaceholder="Naziv nove kategorije"
            emptyText="Kategorij še ni"
            countIcon={ClipboardList}
            countLabel={taskCountLabel}
            addedToast="Kategorija dodana"
            renamedToast="Kategorija preimenovana"
            deletedToast="Kategorija izbrisana"
            deleteTitle="Brisanje kategorije"
            count={(it) => it._count?.tasks ?? 0}
            createExtra={() => ({
            color:
                CALENDAR_COLORS.find((c) => !(categories ?? []).some((k) => k.color === c)) ??
                "BLUE",
            })}
            renderLeading={(it, update, busy) => (
              <CategoryColorPicker
                value={it.color}
                disabled={busy}
                onChange={(color: CalendarColor) => update({ color }, "Barva spremenjena")}
              />
            )}
            deleteBody={(it: ManagedItem) => {
            const n = it._count?.tasks ?? 0;
            return (
                <>
                  <span className="font-semibold text-primary">{it.name}</span>
                  {n > 0
                    ? ` bo odstranjena. Njenih ${n} ${taskCountLabel(n)} ostane v koledarju, le brez kategorije.`
                    : " bo odstranjena. Nobeno opravilo je ne uporablja."}
                </>
              );
            }}
          />
        </section>

        <section className="min-w-0 space-y-4">
          <SectionTitle
            action={<span className="text-sm text-nav-foreground tabular-nums">{faultCategories?.length ?? 0}</span>}
          >
            Kategorije napak
          </SectionTitle>
          <p className="text-sm text-nav-foreground">
            Kakšna je napaka: tiskalne glave, rezanje, podtlak, elektrika … Po njih se razvrsti baza znanja
            in iskanje po njih pove najverjetnejše področje težave.
          </p>
          <ManagedList
            endpoint="/fault-categories"
            items={faultCategories ?? []}
            onChanged={async () => {
              await refetchFaultCategories();
            }}
            addPlaceholder="Naziv nove kategorije"
            emptyText="Kategorij še ni"
            countIcon={NotebookPen}
            countLabel={zapisov}
            addedToast="Kategorija dodana"
            renamedToast="Kategorija preimenovana"
            deletedToast="Kategorija izbrisana"
            deleteTitle="Brisanje kategorije"
            count={(it) => it._count?.articles ?? 0}
            renderLeading={(it, update, busy) => (
              <CategoryIconPicker
                value={it.icon}
                disabled={busy}
                onChange={(icon: FaultCategoryIcon) => update({ icon }, "Ikona spremenjena")}
              />
            )}
            deleteBody={(it: ManagedItem) => {
              const n = it._count?.articles ?? 0;
              return (
                <>
                  <span className="font-semibold text-primary">{it.name}</span>
                  {n > 0
                    ? ` bo odstranjena. Njenih ${n} ${zapisov(n)} ostane v bazi znanja, le brez kategorije.`
                    : " bo odstranjena. Noben zapis je ne uporablja."}
                </>
              );
            }}
          />
        </section>

        <ExternalCodesSection />
      </div>
    </div>
  );
}
