<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);


class XMLFileBooklet extends XMLFile {

    const type = 'Booklet';

    public function crossValidate(WorkspaceValidator $validator): void {

        parent::crossValidate($validator);

        $bookletPlayers = [];
        $this->contextData['totalSize'] = $this->getSize();

        foreach($this->getUnitIds() as $unitId) {

            $unit = $validator->getUnit($unitId);

            if ($unit == null) {
                $this->report('error', "Unit `$unitId` not found");
                continue;
            }

            $this->addRelation(new FileRelation($unit->getType(), $unit->getId(), FileRelationshipType::containsUnit));

            $this->contextData['totalSize'] += $unit->getTotalSize();

            $playerFile = $unit->getPlayerIfExists($validator);

            if (!$playerFile) {

                $this->report('error', "No suitable version of `{$unit->getPlayerId()}` found");
            }

            if ($playerFile and !in_array($playerFile->getId(), $bookletPlayers)) {

                $this->contextData['totalSize'] += $playerFile->getSize();
                $bookletPlayers[] = $playerFile->getId();
            }
        }
    }


    // TODO unit-test $useAlias
    public function getUnitIds(bool $useAlias = false): array {

        if (!$this->isValid()) {
            return [];
        }

        return $this->getUnitIdFromNode($this->xml->Units[0], $useAlias);
    }


    private function getUnitIdFromNode(SimpleXMLElement $node, bool $useAlias = false): array {

        $unitIds = [];
        foreach($node->children() as $element) {

            if ($element->getName() == 'Unit') {

                $id = strtoupper((string) $element['id']);
                $alias = (string) $element['alias'];
                $unitIds[] = ($useAlias and $alias) ? $alias : $id;

            } else {

                foreach($this->getUnitIdFromNode($element, $useAlias) as $id) {
                    $unitIds[] = $id;
                }
            }
        }
        return $unitIds;
    }
}
