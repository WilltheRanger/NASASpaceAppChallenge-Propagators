"""Conservative mask pairing after externally verified geolocation/reprojection.

Arrays must refer to exactly the same ground footprint. Shape equality alone is
not evidence of registration. Low-confidence/unknown pixels are excluded, not
invented non-fire observations.
"""
def paired_counts(left,right,*,registered=False):
 if not registered: raise ValueError('Geographic registration must be verified first')
 if len(left)!=len(right): raise ValueError('Mismatched footprints')
 allowed={5,8,9}; n=lf=rf=0
 for a,b in zip(left,right):
  if a not in range(10) or b not in range(10): raise ValueError('Unexpected fire-mask class')
  if a in allowed and b in allowed:
   n+=1;lf+=a in (8,9);rf+=b in (8,9)
 return {'common_clear_pixels':n,'left_fire_pixels':lf,'right_fire_pixels':rf,'left_fraction':lf/n if n else None,'right_fraction':rf/n if n else None}
