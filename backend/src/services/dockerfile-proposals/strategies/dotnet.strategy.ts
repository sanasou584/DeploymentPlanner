
import type {
  DockerStrategy,
} from '../dockerfile-strategy.types.js';

import {
  pathIn,
} from '../dockerfile-strategy.shared.js';

function projectFiles(
  files: ReadonlySet<string>,
  root: string,
): string[] {
  return [...files].filter((path) => {
    const parent = path.includes('/')
      ? path.slice(0, path.lastIndexOf('/'))
      : '';

    return (
      parent === root &&
      path.toLowerCase().endsWith('.csproj')
    );
  });
}

export const dotnetStrategy: DockerStrategy = {
  id: 'DOTNET',

  verify() {
    if (!this.id || !this.generate || !this.matches) {
      throw new Error('Invalid .NET strategy');
    }
  },

  matches(context) {
    return projectFiles(
      context.files,
      context.root,
    ).length > 0;
  },

  generate(context) {
    const projects = projectFiles(
      context.files,
      context.root,
    );

    if (projects.length !== 1) {
      throw new Error(
        'Exactly one .csproj is required in the component root',
      );
    }

    const csproj = projects[0]!;

    const filename = csproj.split('/').at(-1)!;
    const assembly = filename.replace(/\.csproj$/i, '');

    const content = [
      'FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build',
      'WORKDIR /src',
      'COPY . .',
      `RUN dotnet restore "${filename}"`,
      `RUN dotnet publish "${filename}" ` +
        '-c Release -o /app/publish --no-restore',
      '',
      'FROM mcr.microsoft.com/dotnet/aspnet:8.0',
      'WORKDIR /app',
      'ENV ASPNETCORE_URLS=http://+:8080',
      'COPY --from=build /app/publish .',
      'EXPOSE 8080',
      `ENTRYPOINT ["dotnet", "${assembly}.dll"]`,
      '',
    ].join('\n');

    return {
      content,
      files: [],
      warnings: [
        `Detected project: ${pathIn(context.root, filename)}`,
        'Verify TargetFramework and select the matching .NET SDK/runtime version.',
        'Verify AssemblyName and the generated DLL name.',
        'Multi-project solutions require a repository-root build context.',
        'This template targets ASP.NET Core, not desktop .NET applications.',
        'Docker build has not been executed.',
      ],
    };
  },
};
