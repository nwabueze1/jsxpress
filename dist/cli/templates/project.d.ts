export interface AuthConfig {
    enabled: boolean;
    google?: boolean;
    facebook?: boolean;
    github?: boolean;
}
export declare function appTemplate(dialect?: string, auth?: AuthConfig): string;
export declare function homeControllerTemplate(): string;
export declare function tsconfigTemplate(): string;
export declare function packageJsonTemplate(name: string, dialect?: string, auth?: boolean): string;
export declare function envTemplate(dialect?: string, auth?: AuthConfig): string;
export declare function gitignoreTemplate(): string;
//# sourceMappingURL=project.d.ts.map