
import type {
  DockerStrategy,
} from '../dockerfile-strategy.types.js';

import {
  hasFile,
} from '../dockerfile-strategy.shared.js';

export const springBootStrategy: DockerStrategy = {
  id: 'SPRING_BOOT_MAVEN',

  verify() {
    if (!this.id || !this.generate || !this.matches) {
      throw new Error('Invalid Spring Boot strategy');
    }
  },

  matches(context) {
    return hasFile(
      context.files,
      context.root,
      'pom.xml',
    );
  },

  generate() {
    const content = [
      'FROM maven:3.9-eclipse-temurin-21 AS build',
      'WORKDIR /app',
      'COPY pom.xml ./',
      'RUN mvn -B dependency:go-offline',
      'COPY . .',
      'RUN mvn -B -DskipTests package',
      'RUN set -eu; ' +
        'find target -maxdepth 1 -type f -name "*.jar" ' +
        '! -name "*.jar.original" ' +
        '! -name "*-sources.jar" ' +
        '! -name "*-javadoc.jar" ' +
        '-exec cp {} /app/application.jar \\;',
      '',
      'FROM eclipse-temurin:21-jre',
      'WORKDIR /app',
      'COPY --from=build /app/application.jar app.jar',
      'EXPOSE 8080',
      'ENTRYPOINT ["java", "-jar", "app.jar"]',
      '',
    ].join('\n');

    return {
      content,
      files: [],
      warnings: [
        'Verify Java version compatibility with the project.',
        'Verify Spring Boot produces an executable JAR.',
        'This template assumes a single-module Maven project.',
        'Verify server.port and external runtime configuration.',
        'Docker build has not been executed.',
      ],
    };
  },
};
