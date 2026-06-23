import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type StatBlock } from '@/lib/api'
import { fetchStatBlock, formatChallengeRating, searchMonsters } from '@/lib/srd'

interface StatBlockPickerProps {
  statBlock: StatBlock | null
  onSelect: (block: StatBlock) => void
  onRemove: () => void
}

export function StatBlockPicker({
  statBlock,
  onSelect,
  onRemove,
}: StatBlockPickerProps) {
  const [monsterSearch, setMonsterSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const monstersQuery = useQuery({
    queryKey: ['srd-monsters', submittedSearch],
    queryFn: () => searchMonsters(submittedSearch),
    enabled: submittedSearch.length > 0,
  })

  const statBlockMutation = useMutation({
    mutationFn: fetchStatBlock,
    onSuccess: (block) => {
      onSelect(block)
      setMonsterSearch('')
      setSubmittedSearch('')
    },
  })

  // Older saved NPCs predate traits/actions on the stat block.
  const statBlockTraits = statBlock?.traits ?? []
  const statBlockActions = statBlock?.actions ?? []

  return (
    <div className="space-y-2">
      <Label htmlFor="npc-monster">Stat block (5e SRD)</Label>
      {statBlock ? (
        <div className="space-y-1 rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {statBlock.monsterName}
              <span className="text-muted-foreground">
                {' '}
                — {statBlock.size} {statBlock.type}, CR{' '}
                {formatChallengeRating(statBlock.challengeRating)}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
          <p className="text-muted-foreground">
            AC {statBlock.armorClass} · HP {statBlock.hitPoints} · Speed{' '}
            {statBlock.speed}
          </p>
          <p className="text-muted-foreground">
            STR {statBlock.strength} · DEX {statBlock.dexterity} · CON{' '}
            {statBlock.constitution} · INT {statBlock.intelligence} · WIS{' '}
            {statBlock.wisdom} · CHA {statBlock.charisma}
          </p>
          {statBlock.flavorText && (
            <p className="max-h-24 overflow-y-auto border-t pt-1 text-xs text-muted-foreground italic">
              {statBlock.flavorText}
            </p>
          )}
          {(statBlockTraits.length > 0 || statBlockActions.length > 0) && (
            <div className="max-h-80 space-y-3 overflow-y-auto border-t pt-2">
              {statBlockTraits.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    Traits
                  </p>
                  {statBlockTraits.map((trait) => (
                    <p
                      key={trait.name}
                      className="text-xs text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {trait.name}.
                      </span>{' '}
                      {trait.description}
                    </p>
                  ))}
                </div>
              )}
              {statBlockActions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wide uppercase">
                    Actions
                  </p>
                  {statBlockActions.map((action) => (
                    <p
                      key={action.name}
                      className="text-xs text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {action.name}.
                      </span>{' '}
                      {action.description}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Input
              id="npc-monster"
              value={monsterSearch}
              onChange={(e) => setMonsterSearch(e.target.value)}
              placeholder="Search monsters — goblin, mage, …"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  setSubmittedSearch(monsterSearch.trim())
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmittedSearch(monsterSearch.trim())}
            >
              Search
            </Button>
          </div>
          {monstersQuery.isFetching && (
            <p className="text-sm text-muted-foreground">Searching…</p>
          )}
          {monstersQuery.isError && (
            <p className="text-sm text-destructive">
              {monstersQuery.error.message}
            </p>
          )}
          {monstersQuery.isSuccess && monstersQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No monsters matched.</p>
          )}
          {monstersQuery.isSuccess && monstersQuery.data.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {monstersQuery.data.slice(0, 8).map((monster) => (
                <Button
                  key={monster.index}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={statBlockMutation.isPending}
                  onClick={() => statBlockMutation.mutate(monster.index)}
                >
                  {monster.name}
                </Button>
              ))}
            </div>
          )}
          {statBlockMutation.isError && (
            <p className="text-sm text-destructive">
              {statBlockMutation.error.message}
            </p>
          )}
        </>
      )}
    </div>
  )
}
