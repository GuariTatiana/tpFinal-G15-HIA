import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { Observable } from "rxjs";
import { Complejo, ComplejosResponse } from "../interface/cancha.interface";

@Injectable({
    providedIn: 'root'
})

export class ComplejoService {
    private readonly http = inject(HttpClient);
    private baseUrl: string = environment.apiUrl;

    getMisComplejos(): Observable<ComplejosResponse> {
        return this.http.get<ComplejosResponse>(
            `${this.baseUrl}/complejos/auth/mis-complejos`,
            { withCredentials: true }
        );
    }

    createComplejo(credentials: any): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/complejos`, credentials,
            { withCredentials: true }
        )
    }

    getComplejos(): Observable<ComplejosResponse> {
        return this.http.get<ComplejosResponse>(
            `${this.baseUrl}/complejos`,
            { withCredentials: true }
        )
    }
}