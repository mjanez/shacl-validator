import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Info } from 'lucide-react';
import { ValidationProfile, ProfileSelection } from '../../types';
import mqaConfig from '../../config/mqa-config.json';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';

interface ProfileSelectorProps {
  selectedProfile: ProfileSelection;
  onProfileChange: (profile: ProfileSelection) => void;
  disabled?: boolean;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ selectedProfile, onProfileChange, disabled = false }) => {
  const { t } = useTranslation();
  const profiles = mqaConfig.profiles as Record<string, any>;

  const getProfileLabel = (profileId: string, versionId: string) => {
    const profile = profiles[profileId];
    const version = profile?.versions?.[versionId];
    if (!version) return profileId;
    return t(`profiles.names.${profileId}.${versionId}`, { defaultValue: version.name });
  };

  const getBranchLabel = (branchKey: string, branchValue: string) => t(`profiles.branches.${branchKey}`, { defaultValue: branchValue || branchKey });

  const handleProfileSelect = (profileId: string) => {
    const defaultVersion = profiles[profileId].defaultVersion;
    const defaultBranch = profiles[profileId].defaultBranch || 'main';
    onProfileChange({
      profile: profileId as ValidationProfile,
      version: defaultVersion,
      branch: defaultBranch,
      mode: 'predefined'
    });
  };

  const handleVersionSelect = (version: string) => {
    onProfileChange({
      ...selectedProfile,
      version
    });
  };

  const handleBranchSelect = (branch: string) => {
    onProfileChange({
      ...selectedProfile,
      branch
    });
  };

  const currentProfileConfig = profiles[selectedProfile.profile];
  const currentVersionConfig = currentProfileConfig?.versions[selectedProfile.version];
  const availableVersions = currentProfileConfig ? Object.keys(currentProfileConfig.versions).sort().reverse() : [];
  const availableBranches = currentProfileConfig?.branches || {};
  const hasBranchSelection = Object.keys(availableBranches).length > 0;
  const currentBranch = selectedProfile.branch || currentProfileConfig?.defaultBranch || 'main';

  const renderProfileButton = (label: React.ReactNode, icon?: string) => (
    <Button variant="outline" className="h-12 justify-between gap-2 border-border/70" disabled={disabled}>
      <span className="flex items-center gap-2 text-sm">
        {icon && <img src={icon} alt="" className="h-6 w-6" />}
        {label}
      </span>
      <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 8l4 4 4-4" />
      </svg>
    </Button>
  );

  const renderSimpleButton = (label: React.ReactNode, disabledState: boolean) => (
    <Button variant="outline" className="h-12 justify-between gap-2 border-border/70" disabled={disabled || disabledState}>
      <span className="text-sm font-medium">{label}</span>
      <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 8l4 4 4-4" />
      </svg>
    </Button>
  );

  return (
    <Card className="border border-border/70 bg-card">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">{t('validator.selectProfile')}</CardTitle>
          <CardDescription>{t('validator.workspaceSubtitle')}</CardDescription>
        </div>
        {currentVersionConfig && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild aria-label={t('validator.profileInfo') ?? 'Profile documentation'}>
                  <a href={currentVersionConfig.url} target="_blank" rel="noreferrer" className="text-muted-foreground">
                    <Info className="h-5 w-5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('validator.profileInfo')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label>{t('validator.selectProfile')}</Label>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              {renderProfileButton(getProfileLabel(selectedProfile.profile, selectedProfile.version), currentVersionConfig?.icon)}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[260px]">
              {Object.keys(profiles).map((key) => {
                const profile = profiles[key];
                const defaultVer = profile.versions[profile.defaultVersion];
                return (
                  <DropdownMenuItem
                    key={key}
                    onSelect={(event) => {
                      event.preventDefault();
                      handleProfileSelect(key);
                    }}
                    className="flex items-center gap-3"
                  >
                    {defaultVer.icon && <img src={defaultVer.icon} alt="" className="h-5 w-5" />}
                    <span>{getProfileLabel(key, profile.defaultVersion)}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-2">
              <Label>{t('validator.version')}</Label>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>{renderSimpleButton(selectedProfile.version, availableVersions.length <= 1)}</DropdownMenuTrigger>
                <DropdownMenuContent>
                  {availableVersions.map((ver) => (
                    <DropdownMenuItem
                      key={ver}
                      onSelect={(event) => {
                        event.preventDefault();
                        handleVersionSelect(ver);
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>{ver}</span>
                      {selectedProfile.version === ver && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {hasBranchSelection && (
              <div className="flex flex-col gap-2">
                <Label>{t('validator.branch')}</Label>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>{renderSimpleButton(getBranchLabel(currentBranch, availableBranches[currentBranch]), false)}</DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {Object.entries(availableBranches).map(([branchKey, branchLabel]) => (
                      <DropdownMenuItem
                        key={branchKey}
                        onSelect={(event) => {
                          event.preventDefault();
                          handleBranchSelect(branchKey);
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>{getBranchLabel(branchKey, branchLabel as string)}</span>
                        {currentBranch === branchKey && <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/30 px-6 py-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Badge variant="success" className="uppercase tracking-tight">
            {t('validator.currentProfile')}
          </Badge>
          <span className="text-xs text-muted-foreground/80">{t('validator.profileReadyHint')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span className="font-medium text-foreground">
            {t('validator.validatingAgainst')}: <span className="text-muted-foreground">
              {getProfileLabel(selectedProfile.profile, selectedProfile.version)}
            </span>
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProfileSelector;