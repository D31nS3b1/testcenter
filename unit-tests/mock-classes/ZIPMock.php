<?php

// Zip-Archive import can not be tested, because
// ext/zip does not support userland stream wrappers - so no vfs-support
// see https://github.com/bovigo/vfsStream/wiki/Known-Issues
// Therefore we use this Mock-Class.

class ZIP {

    static array $mockArchive = [];

    static function extract(string $filePath, string $extractionPath): void {

        self::extractFile(self::$mockArchive, $extractionPath);
    }

    static private function extractFile($mockArchiveFolder, $extractionPath) {

        foreach ($mockArchiveFolder as $name => $content) {

            if (is_array($content)) {

                mkdir("$extractionPath/$name");
                self::extractFile($content, "$extractionPath/$name");

            } else {

                file_put_contents("$extractionPath/$name", $content);

            }
        }
    }
}
