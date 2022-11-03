<?php
declare(strict_types=1);


class ResourceFile extends File {

    const type = 'Resource';
    protected VeronaModuleMeta $meta;

    public function __construct(string $path, bool $validate = true) {

        $this->meta = new VeronaModuleMeta();

        parent::__construct($path);

        if (FileExt::has($this->getPath(), 'HTML')) {
            $this->readVeronaMetaData();
        }

        if ($validate) {
            $this->validate();
        }
    }


    private function validate() {

        if ($this->isPackage()) {
            $this->validatePackage();
        }
    }


    public function isVeronaModule(): bool {

        return !!$this->meta->veronaModuleType;
    }



    public function isPackage(): bool {

        return FileExt::has($this->getPath(), 'ITCR.ZIP');
    }


    // player is not it's own class, because player and other resources are stores in the same dir
    // TODO make player and resource two different types
    private function readVeronaMetaData() {

        if (!$this->isValid() or !$this->getContent()) {
            return;
        }

        $document = new DOMDocument();
        $document->loadHTML($this->getContent(), LIBXML_NOERROR);

        if ($metaV4Problem = $this->readVeronaMetadataV4($document)) {

            if (!$this->readVeronaMetadataV35($document)) {

                if (!$this->readVeronaMetadataV3($document)) {

                    $this->report('warning', $metaV4Problem);
                }
            }
        }

        if (!$this->meta->version) {

            $this->meta->version = Version::guessFromFileName(basename($this->getPath()))['full'];
            $this->report('warning', 'Metadata missing. Version guessed from Filename.');
        }

        $this->applyMeta();
        $this->analyzeMeta();
    }


    /**
     * This was a temporary way of defining meta-data of a player until in Verona4 a definitive way was defined. Since
     * we produced a bunch of player-versions including this kind of metadata we should support it as long as we support
     * Verona3.
     *
     * @deprecated
     */
    private function readVeronaMetadataV3(DOMDocument $document): bool {

        $this->meta->label = $this->getPlayerTitleV3($document);

        $meta = $this->getPlayerMetaElementV3($document);
        if (!$meta or !$meta->getAttribute('content')) {
            return false;
        }

        // habits where differently back then
        $contentAttr = $meta->getAttribute('content');
        $includedVersion = Version::guessFromFileName($contentAttr . '.xxx');
        $this->meta->playerId =
            'verona-player-' .
            implode(
                '-',
                array_diff(
                    preg_split("/[-_@\W]/", $contentAttr),
                    ['verona', 'player', 'iqb', $includedVersion['full']]
                )
        );

        $this->meta->version = $meta->getAttribute('data-version');
        $this->meta->veronaVersion = $meta->getAttribute('data-api-version');
        $this->meta->description = $meta->getAttribute('data-description');
        $this->meta->veronaModuleType = 'player';

        $this->report('warning', 'Metadata in meta-tag is deprecated!');
        return true;
    }


    private function getPlayerMetaElementV3(DOMDocument $document): ?DOMElement {

        $metaElements = $document->getElementsByTagName('meta');
        foreach ($metaElements as $metaElement) { /* @var $metaElement DOMElement */
            if ($metaElement->getAttribute('name') == 'application-name') {
                return $metaElement;
            }
        }
        return null;
    }


    private function getPlayerTitleV3(DOMDocument $document): string {

        $titleElements = $document->getElementsByTagName('title');
        if (!count($titleElements)) {
            return '';
        }
        $titleElement = $titleElements[0]; /* @var $titleElement DOMElement */
        return $titleElement->textContent;
    }



    /**
     * This was another temporary way of defining meta-data of a player until in Verona4 a definitive way was defined.
     * Since we produced a bunch of player-versions including this kind of metadata we should support it as long as
     * we support Verona3.
     *
     * @deprecated
     */
    private function readVeronaMetadataV35(DOMDocument $document): bool {

        $metaElem = $this->getPlayerMetaElementV4($document);
        if (!$metaElem) {
            return false;
        }
        try {
            $meta = JSON::decode($metaElem->textContent, true);
        } catch (Exception $e) {
            return false;
        }
        if ($meta["@context"] !== "https://w3id.org/iqb/verona-modules") {
            return false;
        }
        $this->meta->label = $this->getPreferredTranslationV35($meta['name']);
        $this->meta->description = $this->getPreferredTranslationV35($meta['description']);
        $this->meta->playerId = $meta['@id'];
        $this->meta->veronaVersion = $meta['apiVersion'];
        $this->meta->version = $meta['version'];
        $this->meta->veronaModuleType = $meta['@type'];

        $this->report('warning', 'Deprecated meta-data-format found!');
        return true;
    }


    private function getPreferredTranslationV35(?array $multiLangItem): string {

        if (!$multiLangItem or !count($multiLangItem)) {
            return '';
        }

        $first = array_keys($multiLangItem)[0];
        return $multiLangItem['de']
            ?? $multiLangItem['en']
            ?? $multiLangItem[$first];
    }


    private function readVeronaMetadataV4(DOMDocument $document): ?string {

        $metaElem = $this->getPlayerMetaElementV4($document);
        if (!$metaElem) {
            return "No Metadata Element";
        }
        try {
            $meta = JSON::decode($metaElem->textContent, true);
        } catch (Exception $e) {
            return "Could not read metadata: {$e->getMessage()}";
        }
        if (!isset($meta['$schema'])) {
            return "Could not read metadata: \$schema missing";
        }
        if ($meta['$schema'] !== "https://raw.githubusercontent.com/verona-interfaces/metadata/master/verona-module-metadata.json") {
            return "Wrong metadata-schema: {$meta['$schema']}";
        }
        $this->meta->label = $this->getPreferredTranslationV4($meta['name']);
        $this->meta->description = $this->getPreferredTranslationV4($meta['description']);
        $this->meta->playerId = $meta['id'];
        $this->meta->veronaVersion = $meta['specVersion'];
        $this->meta->version = $meta['version'];
        $this->meta->veronaModuleType = $meta['type'];
        return null;
    }


    private function getPreferredTranslationV4(?array $multiLangItem): string {

        if (!$multiLangItem or !count($multiLangItem)) {
            return '';
        }

        foreach ($multiLangItem as $entry) {
            if ($entry['lang'] == 'de') return $entry['value'];
        }
        foreach ($multiLangItem as $entry) {
            if ($entry['lang'] == 'en') return $entry['value'];
        }

        return $multiLangItem[0]['value'];
    }


    private function getPlayerMetaElementV4(DOMDocument $document): ?DOMElement {

        $metaElements = $document->getElementsByTagName('script');
        foreach ($metaElements as $metaElement) { /* @var $metaElement DOMElement */
            if ($metaElement->getAttribute('type') == 'application/ld+json') {
                return $metaElement;
            }
        }
        return null;
    }


    private function applyMeta(): void {

        if ($this->meta->label) {

            $this->label = $this->meta->label;

        } else if ($this->meta->playerId) {

            $this->label = $this->meta->playerId;
            $this->label .= $this->meta->version ? '-' . $this->meta->version : '';
            $this->meta->label = $this->label;
        }

        if ($this->meta->description) {

            $this->description = $this->meta->description;
        }
    }


    private function analyzeMeta(): void {

        if ($this->meta->veronaVersion) {
            $this->report('info', "Verona-Version: {$this->meta->veronaVersion}");
        }

        if ($this->meta->playerId and $this->meta->version) {
            if (
                !FileName::hasRecommendedFormat(
                    basename($this->getPath()),
                    $this->meta->playerId,
                    $this->meta->version,
                    "html"
                )
            ) {
                $this->report('warning', "Non-Standard-Filename: `{$this->meta->playerId}-{$this->meta->version}.html` expected.");
            }
        }
    }


    public function validatePackage(): void {

        try {

            $meta = ZIP::readMeta($this->getPath());

            $this->meta->description = $meta['comment'] ?? '';
            $this->description = $meta['comment'] ?? '';

            $this->report('info', "Contains {$meta['count']} files.");

        } catch (Exception $e) {

            $this->report('error', "Could not read archive: {$e->getMessage()}");
        }
    }


    private function getPackageContentPath(): string {

        return dirname($this->getPath()) . '/' . basename($this->getName(), '.itcr.zip');
    }


    public function getPackageName(): string {

        return basename($this->getName(), '.itcr.zip');
    }

    public function installPackage(): void {

        $contentsDirName = $this->getPackageContentPath();

        try {
            $this->uninstallPackage();

        } catch(Exception $e) {

            $this->report('error', "Could not delete package files: {$e->getMessage()}");
            return;
        }

        try {
            ZIP::extract($this->getPath(), $contentsDirName);

        } catch(Exception $e) {

            $this->report('error', "Could not extract package: {$e->getMessage()}");
            return;
        }
    }


    public function uninstallPackage(): void {

        $contentsDirName = $this->getPackageContentPath();
        if (file_exists($contentsDirName)) {
            if (is_dir($contentsDirName)) {
                Folder::deleteContentsRecursive($contentsDirName);
                rmdir($contentsDirName);
            } else {
                unlink($contentsDirName);
            }
        }
    }


    public function getSpecialInfo(): FileSpecialInfo {

        $info = parent::getSpecialInfo();
        foreach ($this->meta as $key => $value) {
            $info->$key = $value;
        }
        return $info;
    }


    public function getContent(): string {

        if ($this->isValid()) { // does it even exist?
            return file_get_contents($this->path);
        }
        return "";
    }
}
