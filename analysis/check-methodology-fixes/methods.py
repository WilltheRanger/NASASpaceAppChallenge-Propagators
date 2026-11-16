"""Small independently tested corrections; no scientific thresholds changed."""
def common_reference_days(aqua, terra, snpp, noaa20):
    return aqua & terra & snpp & noaa20


def reference_containment(snpp, noaa20_lo, noaa20_hi):
    """P6's written direction; containment is not symmetric."""
    return (snpp >= noaa20_lo) & (snpp <= noaa20_hi)
