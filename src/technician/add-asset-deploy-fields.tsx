import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { AssetKind } from '@/lib/inventory-schema';
import type { StaffRecipient } from '@/lib/deploy-return-schema';
import {
  CampusBuildingSelect,
  DatePickerField,
  FormField,
} from '@/technician/deploy-return-fields';
import { StaffRecipientSearch } from '@/technician/staff-recipient-search';

export type LaptopDeployMode = 'staff' | 'place';

export function AddAssetDeployFields({
  kind,
  laptopMode,
  onLaptopModeChange,
  recipient,
  onRecipientChange,
  handoverDate,
  onHandoverDateChange,
  handoverRemarks,
  onHandoverRemarksChange,
  building,
  onBuildingChange,
  level,
  onLevelChange,
  zone,
  onZoneChange,
  deploymentDate,
  onDeploymentDateChange,
  deploymentRemarks,
  onDeploymentRemarksChange,
}: {
  kind: AssetKind;
  laptopMode: LaptopDeployMode;
  onLaptopModeChange: (mode: LaptopDeployMode) => void;
  recipient: StaffRecipient | null;
  onRecipientChange: (staff: StaffRecipient | null) => void;
  handoverDate: string;
  onHandoverDateChange: (value: string) => void;
  handoverRemarks: string;
  onHandoverRemarksChange: (value: string) => void;
  building: string;
  onBuildingChange: (value: string) => void;
  level: string;
  onLevelChange: (value: string) => void;
  zone: string;
  onZoneChange: (value: string) => void;
  deploymentDate: string;
  onDeploymentDateChange: (value: string) => void;
  deploymentRemarks: string;
  onDeploymentRemarksChange: (value: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deployment</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Required when status is deploy. Creates the handover or deployment record with the asset.
        </p>
      </div>

      {kind === 'laptop' ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={laptopMode === 'staff' ? 'default' : 'outline'}
              size="sm"
              className="rounded-[8px]"
              onClick={() => onLaptopModeChange('staff')}
            >
              Handover to staff
            </Button>
            <Button
              type="button"
              variant={laptopMode === 'place' ? 'default' : 'outline'}
              size="sm"
              className="rounded-[8px]"
              onClick={() => onLaptopModeChange('place')}
            >
              Deploy to place
            </Button>
          </div>

          {laptopMode === 'staff' && (
            <FormField label="Recipient (staff directory)" required>
              <StaffRecipientSearch value={recipient} onSelect={onRecipientChange} />
            </FormField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <DatePickerField
              label="Handover date"
              value={handoverDate}
              onChange={onHandoverDateChange}
              required
            />
            <FormField label="Handover remarks">
              <Textarea
                value={handoverRemarks}
                onChange={(e) => onHandoverRemarksChange(e.target.value)}
                placeholder={
                  laptopMode === 'place'
                    ? 'Location / room / site details'
                    : 'Optional notes'
                }
                className="min-h-[80px] rounded-[8px]"
              />
            </FormField>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Building" required>
            <CampusBuildingSelect value={building} onChange={onBuildingChange} />
          </FormField>
          <FormField label="Level" required>
            <Input
              value={level}
              onChange={(e) => onLevelChange(e.target.value)}
              required
              className="rounded-[8px]"
            />
          </FormField>
          <FormField label="Zone" required>
            <Input
              value={zone}
              onChange={(e) => onZoneChange(e.target.value)}
              required
              className="rounded-[8px]"
            />
          </FormField>
          <DatePickerField
            label="Deployment date"
            value={deploymentDate}
            onChange={onDeploymentDateChange}
            required
          />
          <div className="sm:col-span-2">
            <FormField label="Deployment remarks">
              <Textarea
                value={deploymentRemarks}
                onChange={(e) => onDeploymentRemarksChange(e.target.value)}
                className="min-h-[80px] rounded-[8px]"
              />
            </FormField>
          </div>
        </div>
      )}
    </section>
  );
}
