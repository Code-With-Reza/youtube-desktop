import { Component } from 'solid-js';
import { t } from '@/i18n';

export const LoadingKaomoji: Component = () => {
    return (
        <div class="kaomoji-container">
            <div class="kaomoji">
                ( ◕ ⏳ ◕ )
            </div>
            <div class="kaomoji-text">
                {t('plugins.synced-lyrics.loading')}
            </div>
        </div>
    );
};
