import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ViewerStateService {
    private navigationHistory: string[] = ['building'];
    private currentObjectName = new BehaviorSubject<string>('building');
    private isLinkMode = new BehaviorSubject<boolean>(false);
    private isRemoveLinkMode = new BehaviorSubject<boolean>(false);
    private isLoadingFloor = new BehaviorSubject<boolean>(false);

    public currentObject$ = this.currentObjectName.asObservable();
    public linkMode$ = this.isLinkMode.asObservable();
    public removeLinkMode$ = this.isRemoveLinkMode.asObservable();
    public loadingFloor$ = this.isLoadingFloor.asObservable();

    constructor() {}

    public getNavigationHistory(): string[] {
        return [...this.navigationHistory];
    }

    public addToHistory(objectName: string): void {
        this.navigationHistory.push(objectName);
        this.currentObjectName.next(objectName);
    }

    public goBack(): string | null {
        if (this.navigationHistory.length > 1) {
            this.navigationHistory.pop();
            const previousObject = this.navigationHistory[this.navigationHistory.length - 1];
            this.currentObjectName.next(previousObject);
            return previousObject;
        }
        return null;
    }
    get currentObject(): string {
    let current = '';
    this.currentObject$.subscribe(value => current = value).unsubscribe();
    return current;
}
    public setLinkMode(enabled: boolean): void {
        this.isLinkMode.next(enabled);
        if (enabled) {
            this.isRemoveLinkMode.next(false);
        }
    }

    public setRemoveLinkMode(enabled: boolean): void {
        this.isRemoveLinkMode.next(enabled);
        if (enabled) {
            this.isLinkMode.next(false);
        }
    }

    public setLoadingFloor(loading: boolean): void {
        this.isLoadingFloor.next(loading);
    }

    public resetToBuilding(): void {
        this.navigationHistory = ['building'];
        this.currentObjectName.next('building');
    }
}